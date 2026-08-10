import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { ReminderType, StudentSnapshot } from "./types";
import { THRESHOLDS } from "./rules";
import { riyadhDateKey } from "@/lib/data/date-utils";

/**
 * جامع اللقطات: من جداول Supabase إلى StudentSnapshot لكل طالب.
 *
 * هذا هو الملف الوحيد الذي يعرف *أين* تُخزَّن الحالة. القواعد في rules.ts
 * والقوالب في lib/email لا تعرف عن sources ولا student_activity شيئًا — فحين
 * يُرحَّل مسار الطالب إلى Supabase بالكامل، يتغيّر هذا الملف وحده.
 *
 * كل استعلام هنا دفعة واحدة لكل الطلاب ثم يُضمّ في الذاكرة، لا استعلام لكل
 * طالب: الكنس يمرّ على كل الحسابات دفعةً، ونمط N+1 هنا يعني عشرات الرحلات في
 * استدعاء واحد محدود المهلة.
 */

type DB = SupabaseClient<Database>;

/** يُميّز المصادر التي تكتبها نافذة المعلم عن التي يرفعها الطالب بنفسه. */
export const REMEDIAL_FILE_URL = "internal://remedial";

/** حدّ زمني للقراءة: نشاط أقدم من ذلك لا يغيّر أي قاعدة. */
const ACTIVITY_WINDOW_DAYS = 60;

function daysAgoIso(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

export async function collectSnapshots(admin: DB, now: Date): Promise<StudentSnapshot[]> {
  const { data: students, error: studentsErr } = await admin
    .from("users")
    .select("id, name, email")
    .eq("role", "student");
  if (studentsErr) throw studentsErr;
  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => s.id);
  const today = riyadhDateKey(now);
  const cooldownFrom = riyadhDateKey(new Date(now.getTime() - THRESHOLDS.cooldownDays * 86_400_000));

  const [activityRes, streaksRes, remindersRes, gapsByStudent] = await Promise.all([
    admin
      .from("student_activity")
      .select("student_id, kind, file_ref, label, created_at")
      .in("student_id", studentIds)
      .gte("created_at", daysAgoIso(ACTIVITY_WINDOW_DAYS, now))
      .order("created_at", { ascending: true }),
    admin
      .from("streaks")
      .select("student_id, current, longest, last_active_date")
      .in("student_id", studentIds),
    admin
      .from("reminders")
      .select("student_id, type, sent_on")
      .in("student_id", studentIds)
      .gte("sent_on", cooldownFrom),
    collectUnresolvedGaps(admin, studentIds),
  ]);

  if (activityRes.error) throw activityRes.error;
  if (streaksRes.error) throw streaksRes.error;
  if (remindersRes.error) throw remindersRes.error;

  const streakByStudent = new Map((streaksRes.data ?? []).map((r) => [r.student_id, r]));

  const remindedToday = new Set<string>();
  const recentTypes = new Map<string, Set<ReminderType>>();
  for (const r of remindersRes.data ?? []) {
    if (r.sent_on === today) remindedToday.add(r.student_id);
    if (!recentTypes.has(r.student_id)) recentTypes.set(r.student_id, new Set());
    recentTypes.get(r.student_id)!.add(r.type);
  }

  const pendingByStudent = derivePendingStarts(activityRes.data ?? []);

  const lastActivity = new Map<string, string>();
  for (const a of activityRes.data ?? []) {
    // الصفوف مرتّبة تصاعديًا، فآخر ما يُكتب هو الأحدث.
    lastActivity.set(a.student_id, a.created_at);
  }

  return students.map((student) => {
    const streakRow = streakByStudent.get(student.id);
    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      lastActivityAt: lastActivity.get(student.id) ?? null,
      streak: {
        current: streakRow?.current ?? 0,
        longest: streakRow?.longest ?? 0,
        lastActiveDate: streakRow?.last_active_date ?? null,
      },
      pendingStart: pendingByStudent.get(student.id) ?? null,
      unresolvedGap: gapsByStudent.get(student.id) ?? null,
      remindedToday: remindedToday.has(student.id),
      typesSentRecently: Array.from(recentTypes.get(student.id) ?? []),
    };
  });
}

/* ────────────────────────────── القاعدة ١: ملف بلا بداية ────────────────────────────── */

type ActivityRow = {
  student_id: string;
  kind: Database["public"]["Enums"]["activity_kind"];
  file_ref: string | null;
  label: string | null;
  created_at: string;
};

/**
 * ملف رُفع ولم يُسجَّل عليه أي `section_opened` قطّ. تُعاد الأقدم عند التعدّد:
 * الملف الذي طال إهماله أولى بالتذكير من الذي رُفع أمس.
 */
function derivePendingStarts(
  rows: ActivityRow[],
): Map<string, { fileRef: string; label: string; uploadedAt: string }> {
  const uploads = new Map<string, { fileRef: string; label: string; uploadedAt: string }>();
  const openedFiles = new Set<string>();

  for (const row of rows) {
    if (!row.file_ref) continue;
    const key = `${row.student_id}::${row.file_ref}`;

    if (row.kind === "source_uploaded") {
      // الصفوف تصاعدية، فأول ظهور لهذا الملف هو رفعه الأصلي.
      if (!uploads.has(key)) {
        uploads.set(key, {
          fileRef: row.file_ref,
          label: row.label ?? "ملفك",
          uploadedAt: row.created_at,
        });
      }
    } else {
      // أي أثر آخر على هذا الملف يكفي، لا `section_opened` وحده: تسجيل الفتح
      // ينطلق من المتصفح وقد يسقط، فطالب أجاب أسئلة القسم دون أن يصل تسجيل
      // فتحه كان سيتلقّى رسالة «لم تبدأ» وهو في منتصف الاختبار.
      openedFiles.add(key);
    }
  }

  const oldestByStudent = new Map<string, { fileRef: string; label: string; uploadedAt: string }>();
  for (const [key, upload] of uploads) {
    if (openedFiles.has(key)) continue;
    const studentId = key.split("::")[0];
    const existing = oldestByStudent.get(studentId);
    if (!existing || upload.uploadedAt < existing.uploadedAt) {
      oldestByStudent.set(studentId, upload);
    }
  }
  return oldestByStudent;
}

/* ────────────────────────────── القاعدة ٣: فجوة المعلم ────────────────────────────── */

/**
 * المادة العلاجية التي كتبها المعلم (app/t/class/[id]/actions.ts) موجودة في
 * Supabase أصلًا: مصدر بـ file_url = internal://remedial، وقسم لكل مفهوم،
 * واختبار لكل قسم. «لم يُحلّ» = لا صفّ في attempts لاختبار ذلك القسم.
 *
 * هذه القاعدة الوحيدة التي لا تحتاج سجلّ النشاط إطلاقًا — بياناتها حقيقية منذ
 * قبل هذه الميزة.
 */
async function collectUnresolvedGaps(
  admin: DB,
  studentIds: string[],
): Promise<Map<string, { sectionId: string; label: string; assignedAt: string }>> {
  const result = new Map<string, { sectionId: string; label: string; assignedAt: string }>();

  const { data: sources, error: sourcesErr } = await admin
    .from("sources")
    .select("id, student_id")
    .in("student_id", studentIds)
    .eq("file_url", REMEDIAL_FILE_URL);
  if (sourcesErr) throw sourcesErr;
  if (!sources || sources.length === 0) return result;

  const studentBySource = new Map(sources.map((s) => [s.id, s.student_id]));

  const { data: sections, error: sectionsErr } = await admin
    .from("sections")
    .select("id, source_id, title, created_at")
    .in(
      "source_id",
      sources.map((s) => s.id),
    );
  if (sectionsErr) throw sectionsErr;
  if (!sections || sections.length === 0) return result;

  const { data: quizzes, error: quizzesErr } = await admin
    .from("quizzes")
    .select("id, section_id")
    .in(
      "section_id",
      sections.map((s) => s.id),
    );
  if (quizzesErr) throw quizzesErr;
  if (!quizzes || quizzes.length === 0) return result;

  const { data: attempts, error: attemptsErr } = await admin
    .from("attempts")
    .select("quiz_id")
    .in(
      "quiz_id",
      quizzes.map((q) => q.id),
    );
  if (attemptsErr) throw attemptsErr;

  const attemptedQuizIds = new Set((attempts ?? []).map((a) => a.quiz_id));
  const unresolvedSectionIds = new Set(
    quizzes.filter((q) => !attemptedQuizIds.has(q.id)).map((q) => q.section_id),
  );

  for (const section of sections) {
    if (!unresolvedSectionIds.has(section.id)) continue;
    const studentId = studentBySource.get(section.source_id);
    if (!studentId) continue;

    const existing = result.get(studentId);
    if (!existing || section.created_at < existing.assignedAt) {
      result.set(studentId, {
        sectionId: section.id,
        label: section.title,
        assignedAt: section.created_at,
      });
    }
  }

  return result;
}

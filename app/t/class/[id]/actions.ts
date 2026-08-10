"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRemedial } from "@/lib/ai";
import { fallbackGenerateRemedial } from "@/lib/ai/fallback";
import type { RemedialQuestion } from "@/lib/ai";
import type { Json } from "@/types/db";

const REMEDIAL_SOURCE_FILENAME = "مادة علاجية";

/**
 * الكتابة هنا تعبر إلى محتوى يملكه الطالب (sources/sections/quizzes)، وسياسات
 * RLS على هذه الجداول تمنح "own" حصرًا لصاحب الـ student_id أو service_role —
 * لا صلاحية للمعلم عليها مباشرة. لذلك تُستخدم createAdminClient هنا حصرًا،
 * بعد أن يكون العميل العادي (المقيَّد بـ RLS) قد أثبت أعلاه أن هؤلاء الطلاب
 * فعلًا ضمن فصل يُدرِّسه المعلم الحالي.
 */
async function writeRemedialQuizForStudent(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  title: string,
  explanation: string,
  questions: RemedialQuestion[],
) {
  const { data: existingSource } = await admin
    .from("sources")
    .select("id")
    .eq("student_id", studentId)
    .eq("filename", REMEDIAL_SOURCE_FILENAME)
    .maybeSingle();

  let sourceId = existingSource?.id;
  if (!sourceId) {
    const { data: created, error } = await admin
      .from("sources")
      .insert({
        student_id: studentId,
        filename: REMEDIAL_SOURCE_FILENAME,
        file_url: "internal://remedial",
        status: "ready",
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "تعذّر إنشاء مصدر المادة العلاجية.");
    sourceId = created.id;
  }

  const { data: lastSection } = await admin
    .from("sections")
    .select("order_no")
    .eq("source_id", sourceId)
    .order("order_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (lastSection?.order_no ?? 0) + 1;

  const { data: section, error: sectionErr } = await admin
    .from("sections")
    .insert({
      source_id: sourceId,
      order_no: nextOrder,
      title,
      content_md: explanation,
      is_locked: false,
    })
    .select("id")
    .single();
  if (sectionErr || !section) throw new Error(sectionErr?.message ?? "تعذّر إنشاء قسم المادة العلاجية.");

  const { error: quizErr } = await admin.from("quizzes").insert({
    section_id: section.id,
    mode: "custom",
    questions_json: questions as unknown as Json,
  });
  if (quizErr) throw new Error(quizErr.message);
}

export async function sendRemedialMaterial(classId: string) {
  const supabase = await createClient();

  const { data: exams, error: examsErr } = await supabase.from("exams").select("id").eq("class_id", classId);
  if (examsErr) return { ok: false as const, error: examsErr.message };
  const examIds = (exams ?? []).map((e) => e.id);
  if (examIds.length === 0) {
    return { ok: false as const, error: "لا يوجد اختبارات لهذا الفصل بعد." };
  }

  const { data: submissions, error: subsErr } = await supabase
    .from("submissions")
    .select("id, student_id")
    .in("exam_id", examIds);
  if (subsErr) return { ok: false as const, error: subsErr.message };
  const submissionIds = (submissions ?? []).map((s) => s.id);
  if (submissionIds.length === 0) {
    return { ok: false as const, error: "لا توجد أوراق مرفوعة بعد." };
  }
  const studentBySubmission = new Map((submissions ?? []).map((s) => [s.id, s.student_id]));

  const { data: diagnoses, error: diagErr } = await supabase
    .from("diagnoses")
    .select("submission_id, misconception_id")
    .in("submission_id", submissionIds)
    .eq("is_correct", false)
    .eq("teacher_approved", true)
    .not("misconception_id", "is", null);
  if (diagErr) return { ok: false as const, error: diagErr.message };

  const groups = new Map<string, Set<string>>();
  for (const d of diagnoses ?? []) {
    if (!d.misconception_id) continue;
    const studentId = studentBySubmission.get(d.submission_id);
    if (!studentId) continue;
    if (!groups.has(d.misconception_id)) groups.set(d.misconception_id, new Set());
    groups.get(d.misconception_id)!.add(studentId);
  }

  if (groups.size === 0) {
    return {
      ok: false as const,
      error: "اعتمد نتائج المراجعة أولًا — المادة العلاجية تُبنى فقط على نتائج معتمدة.",
    };
  }

  const { data: catalog, error: catalogErr } = await supabase
    .from("misconceptions")
    .select("id, label, description");
  if (catalogErr) return { ok: false as const, error: catalogErr.message };
  const catalogById = new Map((catalog ?? []).map((m) => [m.id, m]));

  const admin = createAdminClient();

  const settled = await Promise.allSettled(
    Array.from(groups.entries()).map(async ([misconceptionId, studentIdSet]) => {
      const misconception = catalogById.get(misconceptionId);
      const label = misconception?.label ?? "مفهوم مغلوط";
      const description = misconception?.description ?? "";

      let remedial;
      try {
        remedial = await generateRemedial(`${label}: ${description}`.trim());
      } catch {
        remedial = fallbackGenerateRemedial(misconceptionId, description || label);
      }

      const studentIds = Array.from(studentIdSet);
      await Promise.all(
        studentIds.map((studentId) =>
          writeRemedialQuizForStudent(admin, studentId, label, remedial.misconception_description, remedial.questions),
        ),
      );

      return { misconceptionId, label, studentsCount: studentIds.length };
    }),
  );

  const fulfilled = settled.filter(
    (r): r is PromiseFulfilledResult<{ misconceptionId: string; label: string; studentsCount: number }> =>
      r.status === "fulfilled",
  );
  const failedCount = settled.length - fulfilled.length;

  revalidatePath(`/t/class/${classId}`);

  if (fulfilled.length === 0) {
    const firstFailure = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    return {
      ok: false as const,
      error: firstFailure ? String(firstFailure.reason) : "تعذّر توليد المادة العلاجية.",
    };
  }

  return {
    ok: true as const,
    groupsSent: fulfilled.length,
    studentsReached: fulfilled.reduce((sum, r) => sum + r.value.studentsCount, 0),
    labels: fulfilled.map((r) => r.value.label),
    partialFailures: failedCount,
  };
}

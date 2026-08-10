/**
 * استعلامات القراءة لنافذة المعلم. كل دالة تأخذ عميل Supabase جاهزًا (وليس
 * تُنشئه) حتى تبقى قابلة للاستدعاء من Server Components وServer Actions على
 * حدٍّ سواء دون افتراض سياق الطلب.
 *
 * لا تُستخدم صيغة `select("a, rel(b)")` المُضمَّنة هنا عمدًا؛ الأسماء (طالب،
 * مفهوم) تُضمّ يدويًا في الذاكرة بعد استعلامين بسيطين، تفاديًا لهشاشة تفسير
 * PostgREST لعلاقات متعددة الاتجاه على نفس الجدول (users تُشار إليه من أكثر
 * من عمود).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { DiagnosisRow } from "./teacher";

type DB = SupabaseClient<Database>;

export type ClassRow = Database["public"]["Tables"]["classes"]["Row"];
export type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
export type MisconceptionRow = Database["public"]["Tables"]["misconceptions"]["Row"];

export async function getTeacherClasses(supabase: DB, teacherId: string): Promise<ClassRow[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getClassById(supabase: DB, classId: string): Promise<ClassRow | null> {
  const { data, error } = await supabase.from("classes").select("*").eq("id", classId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClassRoster(
  supabase: DB,
  classId: string,
): Promise<{ id: string; name: string }[]> {
  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId);
  if (enrollErr) throw enrollErr;

  const studentIds = (enrollments ?? []).map((e) => e.student_id);
  if (studentIds.length === 0) return [];

  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, name")
    .in("id", studentIds);
  if (usersErr) throw usersErr;

  return (users ?? []).sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export async function getClassExams(supabase: DB, classId: string): Promise<ExamRow[]> {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getExamById(supabase: DB, examId: string): Promise<ExamRow | null> {
  const { data, error } = await supabase.from("exams").select("*").eq("id", examId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMisconceptionsCatalog(supabase: DB): Promise<MisconceptionRow[]> {
  const { data, error } = await supabase.from("misconceptions").select("*").order("outcome_code");
  if (error) throw error;
  return data ?? [];
}

/** يبني صفوف diagnoses مكتملة (اسم الطالب، تسمية المفهوم) لمجموعة اختبارات. */
async function buildDiagnosisRows(
  supabase: DB,
  exams: ExamRow[],
): Promise<DiagnosisRow[]> {
  const examIds = exams.map((e) => e.id);
  if (examIds.length === 0) return [];
  const examTitleById = new Map(exams.map((e) => [e.id, e.title]));

  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("id, exam_id, student_id")
    .in("exam_id", examIds);
  if (subErr) throw subErr;
  if (!submissions || submissions.length === 0) return [];

  const submissionIds = submissions.map((s) => s.id);
  const studentIds = Array.from(new Set(submissions.map((s) => s.student_id)));

  const [{ data: diagnoses, error: diagErr }, { data: users, error: usersErr }, { data: misconceptions, error: miscErr }] =
    await Promise.all([
      supabase
        .from("diagnoses")
        .select("*")
        .in("submission_id", submissionIds)
        .order("question_no"),
      supabase.from("users").select("id, name").in("id", studentIds),
      supabase.from("misconceptions").select("id, label"),
    ]);
  if (diagErr) throw diagErr;
  if (usersErr) throw usersErr;
  if (miscErr) throw miscErr;

  const subById = new Map(submissions.map((s) => [s.id, s]));
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));
  const labelById = new Map((misconceptions ?? []).map((m) => [m.id, m.label]));

  return (diagnoses ?? []).map((d) => {
    const sub = subById.get(d.submission_id);
    return {
      id: d.id,
      submissionId: d.submission_id,
      examId: sub?.exam_id ?? "",
      examTitle: sub ? (examTitleById.get(sub.exam_id) ?? "") : "",
      studentId: sub?.student_id ?? "",
      studentName: sub ? (nameById.get(sub.student_id) ?? "طالب") : "طالب",
      questionNo: d.question_no,
      extractedText: d.extracted_text,
      isCorrect: d.is_correct,
      misconceptionId: d.misconception_id,
      misconceptionLabel: d.misconception_id ? (labelById.get(d.misconception_id) ?? null) : null,
      confidence: d.confidence,
      teacherApproved: d.teacher_approved,
    };
  });
}

/* ────────────────────── تقرير الطالب الفرد (/t/student/[id]) ────────────────────── */

export type StudentProfile = {
  id: string;
  name: string;
  email: string;
  classes: { id: string; name: string; subject: string }[];
};

/**
 * ملف الطالب من زاوية المعلم الحالي: الفصول المعروضة هي فصول هذا المعلم التي
 * ينتمي إليها الطالب فقط — لا كل فصوله. RLS على classes/enrollments هي من
 * تفرض ذلك، فلا تصفية إضافية مطلوبة هنا.
 */
export async function getStudentProfile(
  supabase: DB,
  studentId: string,
): Promise<StudentProfile | null> {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", studentId)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!user || user.role !== "student") return null;

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", studentId);
  if (enrollErr) throw enrollErr;

  const classIds = (enrollments ?? []).map((e) => e.class_id);
  let classes: StudentProfile["classes"] = [];
  if (classIds.length > 0) {
    const { data: rows, error: classErr } = await supabase
      .from("classes")
      .select("id, name, subject")
      .in("id", classIds);
    if (classErr) throw classErr;
    classes = rows ?? [];
  }

  // طالب لا يشترك مع هذا المعلم في أي فصل يبدو له كأنه غير موجود.
  if (classes.length === 0) return null;

  return { id: user.id, name: user.name, email: user.email, classes };
}

export type StudentDiagnosisRow = DiagnosisRow & { examCreatedAt: string };

/** كل تشخيصات الطالب عبر كل اختباراته — الأحدث أولًا. */
export async function getStudentDiagnoses(
  supabase: DB,
  studentId: string,
): Promise<StudentDiagnosisRow[]> {
  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("id, exam_id")
    .eq("student_id", studentId);
  if (subErr) throw subErr;
  if (!submissions || submissions.length === 0) return [];

  const examIds = Array.from(new Set(submissions.map((s) => s.exam_id)));

  const [{ data: exams, error: examErr }, { data: diagnoses, error: diagErr }, { data: misconceptions, error: miscErr }] =
    await Promise.all([
      supabase.from("exams").select("id, title, created_at").in("id", examIds),
      supabase
        .from("diagnoses")
        .select("*")
        .in(
          "submission_id",
          submissions.map((s) => s.id),
        ),
      supabase.from("misconceptions").select("id, label"),
    ]);
  if (examErr) throw examErr;
  if (diagErr) throw diagErr;
  if (miscErr) throw miscErr;

  const examById = new Map((exams ?? []).map((e) => [e.id, e]));
  const subById = new Map(submissions.map((s) => [s.id, s]));
  const labelById = new Map((misconceptions ?? []).map((m) => [m.id, m.label]));

  return (diagnoses ?? [])
    .map((d): StudentDiagnosisRow => {
      const sub = subById.get(d.submission_id);
      const exam = sub ? examById.get(sub.exam_id) : undefined;
      return {
        id: d.id,
        submissionId: d.submission_id,
        examId: exam?.id ?? "",
        examTitle: exam?.title ?? "",
        examCreatedAt: exam?.created_at ?? "",
        studentId,
        studentName: "",
        questionNo: d.question_no,
        extractedText: d.extracted_text,
        isCorrect: d.is_correct,
        misconceptionId: d.misconception_id,
        misconceptionLabel: d.misconception_id ? (labelById.get(d.misconception_id) ?? null) : null,
        confidence: d.confidence,
        teacherApproved: d.teacher_approved,
      };
    })
    .sort(
      (a, b) => b.examCreatedAt.localeCompare(a.examCreatedAt) || a.questionNo - b.questionNo,
    );
}

export type StudentAttemptRow = {
  id: string;
  score: number;
  createdAt: string;
  misconceptionId: string | null;
  misconceptionLabel: string | null;
};

/**
 * محاولات الطالب الذاتية. المعروض هنا هو النتيجة والمفهوم المغلوط فقط — لا
 * عنوان القسم ولا محتواه: sources/sections/quizzes ملك الطالب وحده وRLS لا
 * تمنح المعلم قراءتها. هذا الحدّ متعمَّد، لا نقص في الاستعلام.
 */
export async function getStudentAttempts(
  supabase: DB,
  studentId: string,
): Promise<StudentAttemptRow[]> {
  const { data: attempts, error } = await supabase
    .from("attempts")
    .select("id, score, created_at, misconception_id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!attempts || attempts.length === 0) return [];

  const { data: misconceptions, error: miscErr } = await supabase
    .from("misconceptions")
    .select("id, label");
  if (miscErr) throw miscErr;
  const labelById = new Map((misconceptions ?? []).map((m) => [m.id, m.label]));

  return attempts.map((a) => ({
    id: a.id,
    score: Number(a.score),
    createdAt: a.created_at,
    misconceptionId: a.misconception_id,
    misconceptionLabel: a.misconception_id ? (labelById.get(a.misconception_id) ?? null) : null,
  }));
}

export async function getClassDiagnoses(supabase: DB, classId: string): Promise<DiagnosisRow[]> {
  const exams = await getClassExams(supabase, classId);
  return buildDiagnosisRows(supabase, exams);
}

export async function getExamDiagnoses(supabase: DB, examId: string): Promise<DiagnosisRow[]> {
  const exam = await getExamById(supabase, examId);
  if (!exam) return [];
  const rows = await buildDiagnosisRows(supabase, [exam]);
  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar") || a.questionNo - b.questionNo);
}

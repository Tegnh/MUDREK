"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { diagnoseSheet } from "@/lib/ai";

export async function createExam(classId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false as const, error: "اسم الاختبار مطلوب." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .insert({ class_id: classId, title: trimmed })
    .select("id, class_id, title, created_at")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "تعذّر إنشاء الاختبار." };
  }

  revalidatePath("/t/upload");
  revalidatePath("/t");
  return { ok: true as const, exam: data };
}

export type ProcessImageResult =
  | { ok: true; fileName: string; rowsCreated: number; correctCount: number }
  | { ok: false; fileName: string; error: string };

export async function processExamImage(formData: FormData): Promise<ProcessImageResult> {
  const examId = String(formData.get("examId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const imageBase64 = String(formData.get("imageBase64") ?? "");
  const fileName = String(formData.get("fileName") ?? "صورة");

  if (!examId || !studentId || !imageBase64) {
    return { ok: false, fileName, error: "بيانات ناقصة: يجب اختيار الاختبار والطالب." };
  }

  const supabase = await createClient();

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .upsert(
      {
        exam_id: examId,
        student_id: studentId,
        image_url: `data:image/jpeg;base64,${imageBase64}`,
        status: "processing",
      },
      { onConflict: "exam_id,student_id" },
    )
    .select("id")
    .single();

  if (subErr || !submission) {
    return { ok: false, fileName, error: subErr?.message ?? "تعذّر تسجيل الورقة." };
  }

  try {
    const diagnosis = await diagnoseSheet(imageBase64, examId);

    const { data: validMisconceptions } = await supabase.from("misconceptions").select("id");
    const validIds = new Set((validMisconceptions ?? []).map((m) => m.id));

    await supabase.from("diagnoses").delete().eq("submission_id", submission.id);

    const rows = diagnosis.answers.map((a) => ({
      submission_id: submission.id,
      student_id: studentId,
      question_no: a.question_no,
      extracted_text: a.extracted_text,
      is_correct: a.is_correct,
      // النموذج قد يُخمّن معرّفًا لا يطابق الكتالوج الفعلي؛ نُسقطه بدل أن نكسر
      // قيد المفتاح الأجنبي، ويبقى بإمكان المعلم اختياره يدويًا في المراجعة.
      misconception_id: !a.is_correct && a.misconception_id && validIds.has(a.misconception_id)
        ? a.misconception_id
        : null,
      confidence: a.confidence,
      teacher_approved: false,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("diagnoses").insert(rows);
      if (insErr) throw insErr;
    }

    await supabase.from("submissions").update({ status: "completed" }).eq("id", submission.id);

    revalidatePath(`/t/review/${examId}`);
    revalidatePath(`/t/class/${classId}`);
    revalidatePath("/t");

    return {
      ok: true,
      fileName,
      rowsCreated: rows.length,
      correctCount: rows.filter((r) => r.is_correct).length,
    };
  } catch (e) {
    await supabase.from("submissions").update({ status: "failed" }).eq("id", submission.id);
    return { ok: false, fileName, error: (e as Error).message };
  }
}

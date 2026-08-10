"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateDiagnosis(
  id: string,
  patch: { extracted_text?: string; is_correct?: boolean; misconception_id?: string | null },
) {
  const supabase = await createClient();
  const finalPatch = { ...patch };
  if (finalPatch.is_correct === true) finalPatch.misconception_id = null;

  const { error } = await supabase.from("diagnoses").update(finalPatch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function approveAllDiagnoses(examId: string, classId: string) {
  const supabase = await createClient();

  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("id")
    .eq("exam_id", examId);
  if (subErr) return { ok: false as const, error: subErr.message };

  const submissionIds = (submissions ?? []).map((s) => s.id);
  if (submissionIds.length === 0) return { ok: true as const, count: 0 };

  const { data, error } = await supabase
    .from("diagnoses")
    .update({ teacher_approved: true })
    .in("submission_id", submissionIds)
    .eq("teacher_approved", false)
    .select("id");

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/t/class/${classId}`);
  return { ok: true as const, count: data?.length ?? 0 };
}

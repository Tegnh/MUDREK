"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

export type NewClassState = { error?: string; createdName?: string };

/**
 * فتح فصل جديد.
 *
 * كان حساب المعلم الجديد ينتهي إلى لوحة فارغة بلا مخرج: لا فصول، ولا طريق
 * لإنشاء واحد — فلا يمكنه رفع ورقة اختبار أصلًا (الاختبار يتبع فصلًا).
 *
 * الإدراج يجري بجلسة المعلم لا بمفتاح الخدمة، فتتحقّق سياسة
 * "classes insert as teacher" من teacher_id = auth.uid() ومن الدور معًا.
 * رمز الانضمام تولّده القاعدة (generate_join_code) لا العميل.
 */
export async function createClassAction(
  _prev: NewClassState,
  formData: FormData,
): Promise<NewClassState> {
  const profile = await requireRole("teacher");

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();

  if (name.length < 2) return { error: "أدخل اسم الفصل (مثل: أولى ثانوي — أ)." };
  if (subject.length < 2) return { error: "أدخل اسم المادة (مثل: رياضيات)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .insert({ teacher_id: profile.id, name, subject });

  if (error) {
    return { error: "تعذّر إنشاء الفصل. حاول مرة أخرى." };
  }

  revalidatePath("/t");
  return { createdName: name };
}

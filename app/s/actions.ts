"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

export type JoinClassState = { error?: string; joined?: string };

/**
 * انضمام الطالب إلى فصل برمز.
 *
 * يمرّ عبر دالة القاعدة join_class_by_code لا عبر إدراج مباشر في enrollments:
 * الطالب لا يملك صلاحية القراءة على فصل لم ينضمّ إليه بعد، فلا يستطيع تحويل
 * الرمز إلى معرّف الفصل بنفسه. الدالة SECURITY DEFINER تقوم بالخطوتين معًا
 * وتُدرج باسم auth.uid() حصرًا.
 */
export async function joinClassAction(
  _prev: JoinClassState,
  formData: FormData,
): Promise<JoinClassState> {
  await requireRole("student");

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (code.length < 4) return { error: "أدخل رمز الانضمام كما أعطاك معلّمك." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_class_by_code", { p_join_code: code });

  if (error || !data) {
    return { error: "رمز غير صحيح. تأكّد منه مع معلّمك ثم أعد المحاولة." };
  }

  revalidatePath("/s");
  return { joined: data.name };
}

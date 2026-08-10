import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "إنشاء حساب" };

type Search = Promise<{ role?: string }>;

const LEAD = {
  teacher: "أنشئ حسابك، ثم افتح أول فصل وارفع ورقة اختبار ليبدأ التشخيص.",
  student: "أنشئ حسابك، ثم ارفع أول مصدر دراسي ليقسّمه مُدرِك إلى أقسام قابلة للاختبار.",
} as const;

export default async function SignupPage({ searchParams }: { searchParams: Search }) {
  const { role: rawRole } = await searchParams;
  const role = rawRole === "teacher" ? "teacher" : "student";

  return (
    <AuthShell title="أنشئ حسابًا في مُدرِك" lead={LEAD[role]}>
      <SignupForm initialRole={role} />
    </AuthShell>
  );
}

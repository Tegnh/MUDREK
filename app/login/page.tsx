import Link from "next/link";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "الدخول" };

type Search = Promise<{ role?: string; error?: string }>;

const COPY = {
  teacher: {
    title: "الدخول كمعلم",
    lead: "ادخل بحسابك، ثم ارفع أول ورقة اختبار ليبدأ مُدرِك بتشخيص فصلك.",
    swapHref: "/login?role=student",
    swapLabel: "لست معلمًا؟ ادخل كطالب",
  },
  student: {
    title: "الدخول كطالب",
    lead: "ادخل بحسابك، ثم ارفع أول مصدر دراسي ليقسّمه مُدرِك إلى أقسام قابلة للاختبار.",
    swapHref: "/login?role=teacher",
    swapLabel: "لست طالبًا؟ ادخل كمعلم",
  },
  none: {
    title: "الدخول إلى مُدرِك",
    lead: "ادخل بحسابك. يأخذك مُدرِك مباشرة إلى نافذتك حسب دورك المسجَّل.",
    swapHref: "/",
    swapLabel: "لست متأكدًا؟ اطّلع على المنصة أوّلًا",
  },
} as const;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const { role: rawRole, error } = await searchParams;
  const role = rawRole === "teacher" || rawRole === "student" ? rawRole : null;
  const copy = COPY[role ?? "none"];

  return (
    <AuthShell
      title={copy.title}
      lead={copy.lead}
      notice={
        error === "auth" ? (
          <p className="mt-6 rounded-card border border-danger/25 bg-danger-wash px-4 py-3 text-[13px] leading-relaxed text-danger">
            انتهت صلاحية رابط الدخول أو استُخدم من قبل. ادخل بكلمة المرور، أو اطلب رابطًا جديدًا.
          </p>
        ) : null
      }
      footer={
        /*
          الدور هنا لا يزيد عن ضبط نصّ الصفحة وإنشاء الحساب لأول مرة. لبريد
          مسجَّل من قبل، يُهمَل تمامًا ويبقى users.role هو من يقرّر الوجهة.
        */
        <Link
          href={copy.swapHref}
          className="inline-flex min-h-11 items-center text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          {copy.swapLabel}
        </Link>
      }
    >
      <LoginForm role={role} />
    </AuthShell>
  );
}

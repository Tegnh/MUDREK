import Link from "next/link";
import type { ReactNode } from "react";
import { MudrikLockupEn } from "@/components/brand/Logo";

/**
 * الإطار المشترك لصفحتَي الدخول وإنشاء الحساب: ترويسة بالعلامة، عمود ضيّق
 * في المنتصف، ورابط تبديل أسفل النموذج. الصفحتان متطابقتان بصريًا عمدًا —
 * الانتقال بينهما لا ينبغي أن يبدو انتقالًا إلى مكان آخر.
 */
export function AuthShell({
  title,
  lead,
  notice,
  children,
  footer,
}: {
  title: string;
  lead: string;
  notice?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1080px] items-center px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Mudrik — الصفحة الرئيسية">
            <MudrikLockupEn className="w-[112px]" title="Mudrik" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-14 sm:px-8">
        <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.02em]">{title}</h1>
        <p className="mt-3 text-[14.5px] leading-[1.8] text-muted">{lead}</p>

        {notice}

        <div className="mt-9">{children}</div>

        {footer && <div className="mt-10">{footer}</div>}
      </main>
    </div>
  );
}

export default AuthShell;

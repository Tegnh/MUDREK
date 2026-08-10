import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MudrikLockupEn } from "@/components/brand/Logo";
import AccountChip from "@/components/auth/AccountChip";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "التشغيل", template: "%s · مُدرِك" },
};

/**
 * لوحة تشغيل داخلية. لا دور "admin" في النظام (user_role إمّا teacher أو
 * student)، فالبوابة هنا دور المعلم — وهو أقرب من يملك سببًا لتشغيل مهمة
 * تخاطب طلابه. إضافة دور ثالث لأجل صفحة واحدة كانت ستمسّ RLS كله.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("teacher");

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/t" className="flex shrink-0 items-center" aria-label="Mudrik">
            <MudrikLockupEn className="w-[84px]" title="Mudrik" />
          </Link>
          <span className="label-eyebrow">التشغيل</span>
          <AccountChip name={profile.name} email={profile.email} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
        {children}
      </main>
    </div>
  );
}

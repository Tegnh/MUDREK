import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { MudrikLockupEn } from "@/components/brand/Logo";
import AccountChip from "@/components/auth/AccountChip";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "نافذة المعلم", template: "%s · Mudrik" },
};

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  // حارس على مستوى التخطيط: كل صفحة تحته للمعلّم وحده. middleware يوجّه
  // مبكّرًا، لكن التخطيط هو ما يضمن ذلك عند أي طلب لا يمرّ به.
  const profile = await requireRole("teacher");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <Link href="/t" className="flex items-center gap-3">
            <MudrikLockupEn className="w-[92px]" title="Mudrik" />
            <span className="hidden text-[13px] font-medium text-muted sm:inline">
              نافذة المعلم
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1.5 text-[13.5px] font-medium text-muted">
              <Link
                href="/t"
                className="rounded-card px-3 py-1.5 transition-colors hover:bg-ink/[0.045] hover:text-ink"
              >
                الفصول
              </Link>
              <Link
                href="/t/upload"
                className="rounded-card px-3 py-1.5 transition-colors hover:bg-ink/[0.045] hover:text-ink"
              >
                رفع ورقة اختبار
              </Link>
            </nav>

            <AccountChip name={profile.name} email={profile.email} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}

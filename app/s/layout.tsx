import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MudrikLockupEn } from "@/components/brand/Logo";
import { StreakChip } from "@/components/student/StreakChip";
import { StudentNav } from "@/components/student/StudentNav";
import AccountChip from "@/components/auth/AccountChip";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { readStreak, streakAsOf } from "@/lib/streak";

export const metadata: Metadata = {
  title: { default: "نافذة الطالب", template: "%s · Mudrik" },
};

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("student");

  // العدّاد المعروض هو المعمَّر في public.streaks لا الذي في مخزن الذاكرة:
  // ذاك مشترك بين كل الحسابات ويضيع عند إعادة التشغيل، وهذا مربوط بالحساب وهو
  // نفسه الذي تقرأه مهمة التذكيرات — فلا يختلف ما يراه الطالب عمّا يُراسَل به.
  const supabase = await createClient();
  const streak = await readStreak(supabase, profile.id);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/s" className="flex shrink-0 items-center" aria-label="Mudrik">
            <MudrikLockupEn className="w-[84px]" title="Mudrik" />
          </Link>

          <StudentNav variant="inline" />

          <div className="flex shrink-0 items-center gap-3">
            <StreakChip current={streakAsOf(streak)} size="sm" className="shrink-0" />
            <AccountChip name={profile.name} email={profile.email} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-14 sm:pt-9">
        {children}
      </main>

      <StudentNav variant="mobile" />
    </div>
  );
}

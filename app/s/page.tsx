import Link from "next/link";
import type { Metadata } from "next";
import { listFilesWithProgress, getStreak } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { FileCard } from "@/components/student/FileCard";
import { IconPlus, IconStreak } from "@/components/student/icons";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { JoinClassCard } from "./JoinClassCard";

export const metadata: Metadata = { title: "لوحتي" };

/** الاسم الأول وحده في التحية — الاسم الكامل يبقى في ترويسة الحساب. */
function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

export default async function StudentDashboardPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("student_id", profile.id);

  const files = listFilesWithProgress();
  const streak = getStreak();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[32px]">
            أهلًا، {firstName(profile.name)}
          </h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
            تقدّمك في كل ملف، بدقّة — لا بالتخمين.
          </p>
        </div>
        <Link href="/s/upload" className="hidden sm:block">
          <Button size="sm" icon={<IconPlus />}>
            رفع ملف
          </Button>
        </Link>
      </div>

      <Card className="flex items-center justify-between gap-4" padding="md">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-ink text-surface">
            <IconStreak className="size-4" />
          </span>
          <div>
            <p className="text-[13px] font-medium text-muted">عدّاد الالتزام اليومي</p>
            <p className="tabular text-[20px] font-bold leading-tight">
              {streak.current} <span className="text-[13px] font-medium text-muted">يوم متتالٍ</span>
            </p>
          </div>
        </div>
        <p className="hidden text-[12.5px] text-muted sm:block">
          الأطول: <span className="tabular font-medium text-ink">{streak.longest}</span> يومًا
        </p>
      </Card>

      <JoinClassCard enrolledCount={count ?? 0} />

      {files.length === 0 ? (
        <EmptyState
          tone="neutral"
          title="لا ملفات بعد"
          description="ابدأ برفع أول مصدر دراسي، وسيقسّمه مُدرِك تلقائيًا إلى أقسام قابلة للاختبار."
          action={
            <Link href="/s/upload">
              <Button icon={<IconPlus />}>ابدأ برفع أول ملف</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}

      <Link href="/s/upload" className="block sm:hidden">
        <Button fullWidth icon={<IconPlus />}>
          رفع ملف جديد
        </Button>
      </Link>
    </div>
  );
}

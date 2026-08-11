import { Card } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

/**
 * يظهر أثناء توليد اختبار القسم عند أوّل فتحٍ له. بدونه تبقى الصفحة السابقة
 * معلّقة بلا إشارة، فيبدو التوليدُ تعليقًا.
 */
export default function Loading() {
  return (
    <div className="space-y-7">
      <Skeleton className="h-4 w-28" />

      <div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
      </div>

      <Card padding="lg">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </Card>

      <p className="text-center text-[12.5px] text-muted">جارٍ تجهيز اختبار هذا القسم…</p>
    </div>
  );
}

import { Card } from "@/components/ui/Card";
import Skeleton, { SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <header>
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-3 h-3.5 w-72" />
        <div className="mt-6 flex gap-2.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-32" />
        </div>
      </header>

      <section>
        <Skeleton className="mb-4 h-3 w-24" />
        <Card padding="none">
          <div className="space-y-3 p-5">
            <SkeletonText lines={4} />
          </div>
        </Card>
      </section>

      <section>
        <Skeleton className="mb-4 h-3 w-24" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} padding="none">
              <div className="border-b border-line px-5 py-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
              <div className="space-y-3 p-5">
                <SkeletonText lines={3} />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

import { Card } from "@/components/ui/Card";
import Skeleton, { SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <header className="mb-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-80" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
            <div className="mt-6 space-y-3 border-t border-line pt-5">
              <SkeletonText lines={3} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

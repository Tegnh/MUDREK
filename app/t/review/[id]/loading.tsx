import { Card } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <header className="mb-10">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-2 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />
      </header>

      <Card padding="none">
        <div className="space-y-4 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

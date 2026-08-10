import { Card } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <header>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-40" />
      </header>

      <section>
        <Skeleton className="mb-4 h-3.5 w-32" />
        <Card padding="lg">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Skeleton className="mb-4 h-3.5 w-40" />
        <Card padding="lg">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

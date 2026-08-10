import { Card } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <header className="mb-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-96" />
      </header>

      <Card padding="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="mt-6 h-44 w-full" />
      </Card>
    </div>
  );
}

import Link from "next/link";
import type { FileWithProgress } from "@/lib/data/store";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconForward } from "./icons";

export function FileCard({ file }: { file: FileWithProgress }) {
  const allMastered = file.masteredCount === file.sectionCount && file.sectionCount > 0;
  // "تابع" لا "ابدأ": يكفي أن يكون القسم التالي قد بدأ فعلًا، حتى لو لم يُتقن
  // أي قسم بعد (completionPct صار يقيس الإتقان وحده).
  const started = file.masteredCount > 0 || (file.nextSection?.answeredCount ?? 0) > 0;

  const ctaHref = allMastered
    ? `/s/course/${file.id}`
    : file.nextSection
      ? `/s/lesson/${file.nextSection.id}`
      : `/s/course/${file.id}`;

  const ctaLabel = allMastered ? "مراجعة الملف" : started ? "تابع" : "ابدأ";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{file.title}</CardTitle>
          <CardDescription className="mt-1.5">
            <Badge size="sm">{file.subject}</Badge>
          </CardDescription>
        </div>
      </div>

      <ProgressBar
        value={file.completionPct}
        caption={`${file.masteredCount} من ${file.sectionCount} أقسام مُتقَنة`}
      />

      <Link href={ctaHref} className="mt-1">
        <Button variant={allMastered ? "ghost" : "primary"} fullWidth icon={<IconForward />}>
          {ctaLabel}
        </Button>
      </Link>
    </Card>
  );
}

export default FileCard;

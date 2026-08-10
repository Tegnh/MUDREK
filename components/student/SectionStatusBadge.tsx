import type { SectionStatus } from "@/lib/data/types";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { IconCheck, IconDot, IconLock, IconPlay } from "./icons";

const CONFIG: Record<SectionStatus, { label: string; variant: BadgeProps["variant"] }> = {
  mastered: { label: "مُتقَن", variant: "solid" },
  in_progress: { label: "قيد التقدّم", variant: "neutral" },
  available: { label: "متاح", variant: "neutral" },
  locked: { label: "مقفل", variant: "neutral" },
};

export function SectionStatusBadge({
  status,
  size = "md",
}: {
  status: SectionStatus;
  size?: BadgeProps["size"];
}) {
  const { label, variant } = CONFIG[status];
  return (
    <Badge variant={variant} size={size} className={status === "locked" ? "text-muted/70" : undefined}>
      {status === "mastered" && <IconCheck className="size-3" />}
      {status === "in_progress" && <IconPlay className="size-2.5" />}
      {status === "available" && <IconDot className="size-2" />}
      {status === "locked" && <IconLock className="size-3" />}
      {label}
    </Badge>
  );
}

export default SectionStatusBadge;

import { cn } from "@/lib/utils";
import { PROPERTY_STATUS_COLOR } from "@/lib/constants";
import type { PropertyStatus } from "@/lib/types";

interface PropertyStatusBadgeProps {
  status: PropertyStatus;
  className?: string;
}

export function PropertyStatusBadge({ status, className }: PropertyStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        PROPERTY_STATUS_COLOR[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

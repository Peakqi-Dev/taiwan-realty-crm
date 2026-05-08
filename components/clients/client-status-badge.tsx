import { cn } from "@/lib/utils";
import { CLIENT_STATUS_COLOR } from "@/lib/constants";
import type { ClientStatus } from "@/lib/types";

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        CLIENT_STATUS_COLOR[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

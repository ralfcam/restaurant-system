import { cn } from "@/lib/utils"
import type { ReservationStatus } from "@/lib/data"

const META: Record<ReservationStatus, { label: string; className: string }> = {
  confirmed: {
    label: "Confirmed",
    className: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  },
  seated: {
    label: "Seated",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  completed: {
    label: "Completed",
    className: "bg-accent/10 text-accent border-accent/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-border",
  },
}

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus
}) {
  const meta = META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  TABLE_STATUS_META,
  type ReservationStatus,
  type TableStatus,
} from "@/lib/data"

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: "status.reservation.confirmed",
    className: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  },
  seated: {
    label: "status.reservation.seated",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  completed: {
    label: "status.reservation.completed",
    className: "bg-accent/10 text-accent border-accent/30",
  },
  cancelled: {
    label: "status.reservation.cancelled",
    className: "bg-muted text-muted-foreground border-border",
  },
  no_show: {
    label: "status.reservation.noShow",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
}

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus
}) {
  const t = useTranslations()
  const meta = RESERVATION_STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      {t(meta.label)}
    </span>
  )
}

export function TableStatusLabel({ status }: { status: TableStatus }) {
  const t = useTranslations()
  return t(TABLE_STATUS_META[status].label)
}

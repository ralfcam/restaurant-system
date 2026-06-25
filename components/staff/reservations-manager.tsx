"use client"

import { useMemo, useState } from "react"
import { Search, Phone, Check, Armchair, X } from "lucide-react"
import { toast } from "sonner"
import {
  RESERVATIONS,
  type Reservation,
  type ReservationStatus,
} from "@/lib/data"
import { ReservationStatusBadge } from "@/components/staff/reservation-status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Tab = "all" | ReservationStatus

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "seated", label: "Seated" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export function ReservationsManager() {
  const [reservations, setReservations] = useState<Reservation[]>(
    [...RESERVATIONS].sort((a, b) => a.time.localeCompare(b.time)),
  )
  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const matchTab = tab === "all" || r.status === tab
      const matchQuery =
        query.trim() === "" ||
        r.guestName.toLowerCase().includes(query.toLowerCase()) ||
        r.phone.includes(query)
      return matchTab && matchQuery
    })
  }, [reservations, tab, query])

  function updateStatus(id: string, status: ReservationStatus) {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    )
    const labels: Record<ReservationStatus, string> = {
      confirmed: "marked confirmed",
      seated: "seated",
      completed: "completed",
      cancelled: "cancelled",
    }
    toast.success(`Reservation ${labels[status]}`)
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {/* Header row (desktop) */}
        <div className="hidden grid-cols-[80px_1fr_120px_120px_140px] gap-4 border-b border-border bg-secondary/50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Time</span>
          <span>Guest</span>
          <span>Party</span>
          <span>Table</span>
          <span>Status</span>
        </div>

        <ul className="divide-y divide-border">
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No reservations match your filters.
            </li>
          ) : (
            filtered.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[80px_1fr_120px_120px_140px] md:items-center md:gap-4"
              >
                <span className="font-heading text-sm font-semibold">
                  {r.time}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{r.guestName}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="size-3" /> {r.phone}
                  </p>
                  {r.notes ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.notes}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm">
                  <span className="md:hidden text-muted-foreground">Party: </span>
                  {r.partySize} guests
                </span>
                <span className="text-sm">
                  {r.tableLabel ? (
                    `Table ${r.tableLabel}`
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </span>
                <div className="flex items-center justify-between gap-2 md:justify-start">
                  <ReservationStatusBadge status={r.status} />
                  <ReservationActions
                    reservation={r}
                    onUpdate={updateStatus}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {reservations.length} reservations
      </p>
    </div>
  )
}

function ReservationActions({
  reservation,
  onUpdate,
}: {
  reservation: Reservation
  onUpdate: (id: string, status: ReservationStatus) => void
}) {
  if (reservation.status === "confirmed") {
    return (
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          title="Seat guest"
          onClick={() => onUpdate(reservation.id, "seated")}
        >
          <Armchair className="size-4" />
          <span className="sr-only">Seat</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-destructive hover:text-destructive"
          title="Cancel"
          onClick={() => onUpdate(reservation.id, "cancelled")}
        >
          <X className="size-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
    )
  }
  if (reservation.status === "seated") {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="size-8 text-accent hover:text-accent"
        title="Complete"
        onClick={() => onUpdate(reservation.id, "completed")}
      >
        <Check className="size-4" />
        <span className="sr-only">Complete</span>
      </Button>
    )
  }
  return null
}

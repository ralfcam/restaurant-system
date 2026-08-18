"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Minus, Users, Armchair } from "lucide-react"
import { toast } from "sonner"
import {
  TABLE_STATUS_META,
  type TableStatus,
} from "@/lib/data"
import { createTable, deleteTable, updateTableState } from "@/app/actions/operations"
import {
  transitionReservationStatus,
  type FloorSnapshot,
  type ReservationRow,
} from "@/app/actions/reservations"
import { useFloorPlan } from "@/hooks/use-floor-plan"
import { ReservationStatusBadge } from "@/components/staff/reservation-status"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const STATUS_ORDER: TableStatus[] = [
  "available",
  "reserved",
  "seated",
  "cleaning",
  "out_of_service",
]

export function FloorPlan({
  date,
  fallbackData,
}: {
  date: string
  fallbackData?: FloorSnapshot
}) {
  const { tables, reservations, mutate, isValidating } = useFloorPlan(date, fallbackData)
  const [selectedId, setSelectedId] = useState<string | null>(
    fallbackData?.tables[0]?.id ?? null,
  )
  const [seating, setSeating] = useState(false)

  const selected = tables.find((t) => t.id === selectedId) ?? tables[0] ?? null
  const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0)
  const upcoming = useMemo(
    () =>
      reservations
        .filter((row) => row.status === "confirmed" || row.status === "seated")
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time)),
    [reservations],
  )

  async function setStatus(id: string, status: TableStatus) {
    try {
      await updateTableState({ id, status })
      await mutate()
    } catch {
      toast.error("Could not update table")
    }
  }

  async function adjustSeats(id: string, delta: number) {
    const selectedTable = tables.find((t) => t.id === id)
    if (!selectedTable) return
    const seats = Math.max(1, Math.min(12, selectedTable.seats + delta))
    try {
      await updateTableState({ id, seats })
      await mutate()
    } catch {
      toast.error("Could not update capacity")
    }
  }

  async function addTable() {
    try {
      const newTable = await createTable()
      await mutate()
      setSelectedId(newTable.id)
      toast.success(`Table ${newTable.label} added`)
    } catch {
      toast.error("Could not add table")
    }
  }

  async function removeTable(id: string) {
    const table = tables.find((row) => row.id === id)
    try {
      await deleteTable(id)
      await mutate()
      if (selectedId === id) setSelectedId(null)
      if (table) toast.success(`Table ${table.label} removed`)
    } catch {
      toast.error("Could not remove table")
    }
  }

  async function seatParty(reservation: ReservationRow) {
    setSeating(true)
    const { error } = await transitionReservationStatus(reservation.id, "seated")
    setSeating(false)
    if (error) {
      toast.error("Could not seat party", { description: error })
      return
    }
    toast.success(`Seated ${reservation.guest_name}`)
    await mutate()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold">Dining Room</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-accent" />
                  </span>
                  Live
                </span>
                {isValidating ? (
                  <span className="text-xs text-muted-foreground">Updating…</span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {tables.length} tables · {totalSeats} seats · reservations update automatically
              </p>
            </div>
            <Button size="sm" onClick={addTable}>
              <Plus className="size-4" /> Add table
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 rounded-lg border border-dashed border-border bg-secondary/30 p-5">
            {tables.map((t) => {
              const meta = TABLE_STATUS_META[t.displayStatus]
              const isSelected = t.id === (selected?.id ?? selectedId)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center border-2 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-100",
                    t.shape === "round" && "rounded-full",
                    t.shape === "square" && "rounded-lg",
                    t.shape === "rect" && "rounded-lg",
                    t.seats <= 2 ? "size-20" : t.seats <= 4 ? "size-24" : "h-24 w-32",
                    meta.color,
                    isSelected
                      ? "z-10 scale-105 ring-2 ring-primary ring-offset-2 ring-offset-card"
                      : "hover:brightness-95 hover:shadow-md",
                  )}
                >
                  {t.displayStatus === "seated" ? (
                    <span className="absolute right-1.5 top-1.5 flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-current" />
                    </span>
                  ) : null}
                  <span className="font-heading text-lg font-semibold leading-none">
                    {t.label}
                  </span>
                  <span className="mt-1 flex items-center gap-0.5 text-xs">
                    <Users className="size-3" /> {t.reservation?.partySize ?? t.seats}
                  </span>
                  {t.reservation ? (
                    <span className="mt-0.5 max-w-[90%] truncate px-1 text-[10px] leading-tight">
                      {t.reservation.guestName}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            {STATUS_ORDER.map((status) => (
              <span
                key={status}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className={`size-2.5 rounded-full ${TABLE_STATUS_META[status].dot}`}
                />
                {TABLE_STATUS_META[status].label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold">Tonight’s book</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Tables are auto-assigned 15 minutes before the booked time.
          </p>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No confirmed reservations today.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 shrink-0 font-heading text-sm font-semibold tabular-nums">
                    {row.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Party of {row.party_size}
                      {row.table_label ? ` · Table ${row.table_label}` : " · waiting for a table"}
                    </p>
                  </div>
                  <ReservationStatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Selected
              </p>
              <h3 className="font-heading text-2xl font-semibold">
                Table {selected.label}
              </h3>
            </div>

            {selected.reservation ? (
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reservation
                </p>
                <p className="font-medium">{selected.reservation.guestName}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.reservation.time} · party of {selected.reservation.partySize}
                </p>
                <div className="mt-2">
                  <ReservationStatusBadge status={selected.reservation.status} />
                </div>
                {selected.reservation.status === "confirmed" ? (
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    disabled={seating}
                    onClick={() => {
                      const row = reservations.find((r) => r.id === selected.reservation?.id)
                      if (row) void seatParty(row)
                    }}
                  >
                    <Armchair className="size-4" /> Seat party
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reservation on this table right now.
              </p>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(selected.id, status)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                      selected.displayStatus === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {TABLE_STATUS_META[status].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Seat capacity</p>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustSeats(selected.id, -1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-10 text-center font-heading text-2xl font-semibold tabular-nums">
                  {selected.seats}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustSeats(selected.id, 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => removeTable(selected.id)}
            >
              <Trash2 className="size-4" /> Remove table
            </Button>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Select a table to edit its status and capacity.
          </p>
        )}
      </div>
    </div>
  )
}

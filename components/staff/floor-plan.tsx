"use client"

import { useMemo, useRef, useState, type DragEvent } from "react"
import { Plus, Trash2, Minus, Users, Armchair, Clock, Combine, Unlink } from "lucide-react"
import { toast } from "sonner"
import {
  TABLE_STATUS_META,
  type TableStatus,
} from "@/lib/data"
import {
  createTable,
  deleteTable,
  mergeTables,
  splitMerge,
  updateTableState,
} from "@/app/actions/operations"
import {
  transitionReservationStatus,
  type FloorSnapshot,
  type ReservationRow,
} from "@/app/actions/reservations"
import { useFloorPlan } from "@/hooks/use-floor-plan"
import { tableChipSizeClass, tableShapeForSeats } from "@/lib/table-shape"
import {
  canMergeTables,
  clampExpectedMinutes,
  EXPECTED_MINUTES_STEP,
  formatDurationMinutes,
  remainingMinutes,
} from "@/lib/floor/table-use"
import { groupTablesForDisplay } from "@/lib/floor/floor-units"
import {
  FLOOR_TABLE_DRAG_MIME,
  isDragMergeable,
  resolveMergeDrop,
  type MergeDropTable,
} from "@/lib/floor/merge-drop"
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

function toMergeDropTable(table: {
  id: string
  status: TableStatus
  displayStatus?: TableStatus
  mergeId?: string | null
  merge?: { id: string; status: TableStatus; memberIds: string[] } | null
  reservation?: unknown | null
}): MergeDropTable {
  return {
    id: table.id,
    status: table.status,
    displayStatus: table.displayStatus,
    mergeId: table.merge?.id ?? table.mergeId ?? null,
    merge: table.merge
      ? { id: table.merge.id, status: table.merge.status, memberIds: table.merge.memberIds }
      : null,
    reservation: table.reservation,
  }
}

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
  const [mergePick, setMergePick] = useState<string[]>([])
  const [merging, setMerging] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const skipClickAfterDrag = useRef(false)

  const selected = tables.find((t) => t.id === selectedId) ?? tables[0] ?? null
  const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0)
  const mergeCount = new Set(tables.flatMap((table) => (table.merge ? [table.merge.id] : []))).size
  const groups = useMemo(() => groupTablesForDisplay(tables), [tables])
  const upcoming = useMemo(
    () =>
      reservations
        .filter((row) => row.status === "confirmed" || row.status === "seated")
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time)),
    [reservations],
  )

  const dropTables = useMemo(
    () => tables.map((table) => toMergeDropTable(table)),
    [tables],
  )

  const mergePartners = tables.filter(
    (table) => table.id !== selected?.id && isDragMergeable(toMergeDropTable(table)),
  )
  const selectedMergeable = selected ? isDragMergeable(toMergeDropTable(selected)) : false

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
    if (!selectedTable || selectedTable.merge) return
    const seats = Math.max(1, Math.min(12, selectedTable.seats + delta))
    try {
      await updateTableState({ id, seats })
      await mutate()
    } catch {
      toast.error("Could not update capacity")
    }
  }

  async function adjustExpected(id: string, delta: number) {
    const selectedTable = tables.find((t) => t.id === id)
    if (!selectedTable) return
    const current = selectedTable.merge?.expectedMinutes ?? selectedTable.expectedMinutes
    try {
      await updateTableState({ id, expectedMinutes: clampExpectedMinutes(current + delta) })
      await mutate()
    } catch {
      toast.error("Could not update expected time")
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

  function toggleMergePick(id: string) {
    setMergePick((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    )
  }

  async function combineTables(tableIds: string[]) {
    setMerging(true)
    try {
      const arrangement = await mergeTables({ tableIds })
      await mutate()
      setMergePick([])
      toast.success(`Merged tables ${arrangement.label}`, {
        description: `${arrangement.seats} seats · ${formatDurationMinutes(arrangement.expectedMinutes)}`,
      })
    } catch (error) {
      toast.error("Could not merge tables", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setMerging(false)
    }
  }

  function inspectorMergeError(): string | null {
    if (!selected || mergePick.length === 0) return "Select at least two tables to merge."
    const picked = dropTables.filter(
      (table) => table.id === selected.id || mergePick.includes(table.id),
    )
    if (picked.length !== 1 + mergePick.length) return "Tables not found."
    if (picked.some((table) => !isDragMergeable(table))) {
      return "Only available tables can be merged."
    }
    return canMergeTables(picked)
  }

  async function combineSelected() {
    const reason = inspectorMergeError()
    if (reason) {
      toast.error("Could not merge tables", { description: reason })
      return
    }
    if (!selected) return
    await combineTables([selected.id, ...mergePick])
  }

  function readDraggedTableId(event: DragEvent) {
    return (
      event.dataTransfer.getData(FLOOR_TABLE_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain")
    )
  }

  function dropKeyFor(table: (typeof tables)[number]) {
    return table.merge ? `merge:${table.merge.id}` : table.id
  }

  async function mergeFromDrop(targetId: string, event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    const sourceId = draggingId ?? readDraggedTableId(event)
    setDraggingId(null)
    setDropTargetKey(null)
    const result = resolveMergeDrop(sourceId, targetId, dropTables)
    if (!result.tableIds) {
      toast.error("Could not merge tables", { description: result.error })
      return
    }
    await combineTables(result.tableIds)
  }

  async function splitSelected() {
    if (!selected?.merge) return
    try {
      await splitMerge(selected.merge.id)
      await mutate()
      toast.success(`Split tables ${selected.merge.label}`)
    } catch {
      toast.error("Could not split tables")
    }
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
                {tables.length} tables · {totalSeats} seats
                {mergeCount > 0 ? ` · ${mergeCount} merged` : ""}
                {" · "}reservations update automatically
              </p>
            </div>
            <Button size="sm" onClick={addTable}>
              <Plus className="size-4" /> Add table
            </Button>
          </div>

          <p className="mb-3 text-xs text-muted-foreground">
            Drag an available table onto another to merge them.
          </p>
          <div className="flex flex-wrap gap-4 rounded-lg border border-dashed border-border bg-secondary/30 p-5">
            {groups.map((group) => {
              const merge = group.tables[0]?.merge
              const groupDropKey = merge ? `merge:${merge.id}` : null
              const chips = group.tables.map((t) => {
                const meta = TABLE_STATUS_META[t.displayStatus]
                const isSelected = t.id === (selected?.id ?? selectedId)
                const silhouette = tableShapeForSeats(t.seats)
                const dragTable = toMergeDropTable(t)
                const canDrag = isDragMergeable(dragTable) && !merging
                const targetKey = dropKeyFor(t)
                const isDropTarget = dropTargetKey === targetKey
                const acceptsDrag =
                  Boolean(draggingId) &&
                  draggingId !== t.id &&
                  !resolveMergeDrop(draggingId!, t.id, dropTables).error
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable={canDrag}
                    title={
                      canDrag
                        ? "Drag onto another available table to merge"
                        : undefined
                    }
                    onClick={() => {
                      if (skipClickAfterDrag.current) return
                      setSelectedId(t.id)
                      setMergePick([])
                    }}
                    onDragStart={(event) => {
                      if (!canDrag) {
                        event.preventDefault()
                        return
                      }
                      skipClickAfterDrag.current = true
                      event.dataTransfer.setData(FLOOR_TABLE_DRAG_MIME, t.id)
                      event.dataTransfer.setData("text/plain", t.id)
                      event.dataTransfer.effectAllowed = "link"
                      setDraggingId(t.id)
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDropTargetKey(null)
                      window.setTimeout(() => {
                        skipClickAfterDrag.current = false
                      }, 0)
                    }}
                    onDragOver={(event) => {
                      if (!acceptsDrag) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = "link"
                      setDropTargetKey(targetKey)
                    }}
                    onDragLeave={() => {
                      setDropTargetKey((current) => (current === targetKey ? null : current))
                    }}
                    onDrop={(event) => {
                      void mergeFromDrop(t.id, event)
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center border-2 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-100",
                      silhouette === "round" ? "rounded-full" : "rounded-lg",
                      tableChipSizeClass(t.seats),
                      meta.color,
                      canDrag ? "cursor-grab active:cursor-grabbing" : null,
                      draggingId === t.id ? "opacity-50" : null,
                      isSelected
                        ? "z-10 scale-105 ring-2 ring-primary ring-offset-2 ring-offset-card"
                        : "hover:brightness-95 hover:shadow-md",
                      isDropTarget
                        ? "z-10 scale-105 ring-2 ring-accent ring-offset-2 ring-offset-card"
                        : null,
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
              })

              if (!merge) return chips

              const groupAcceptsDrag =
                Boolean(draggingId) &&
                Boolean(group.tables[0]?.id) &&
                !group.tables.some((table) => table.id === draggingId) &&
                !resolveMergeDrop(draggingId!, group.tables[0]!.id, dropTables).error

              return (
                <div
                  key={merge.id}
                  role="group"
                  aria-label={`Merged tables ${merge.label}, ${merge.seats} seats`}
                  onDragOver={(event) => {
                    if (!groupAcceptsDrag || !group.tables[0]) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "link"
                    setDropTargetKey(groupDropKey)
                  }}
                  onDrop={(event) => {
                    const targetId = group.tables[0]?.id
                    if (targetId) void mergeFromDrop(targetId, event)
                  }}
                  className={cn(
                    "flex flex-wrap items-end gap-2 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-2",
                    dropTargetKey === groupDropKey
                      ? "border-accent bg-accent/10 ring-2 ring-accent ring-offset-2 ring-offset-card"
                      : null,
                  )}
                >
                  {chips}
                  <div className="px-1 pb-1 text-[10px] leading-tight text-muted-foreground">
                    <p className="font-medium text-foreground">{merge.seats} seats</p>
                    <p className="flex items-center gap-0.5">
                      <Clock className="size-2.5" />
                      {formatDurationMinutes(remainingMinutes(merge.expiresAt, new Date()))} left
                    </p>
                  </div>
                </div>
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
                {selected.merge ? `Tables ${selected.merge.label}` : `Table ${selected.label}`}
              </h3>
              {selected.merge ? (
                <p className="text-sm text-muted-foreground">
                  Temporary arrangement · {selected.merge.seats} seats
                </p>
              ) : null}
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
              {selected.merge ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Status updates every table in {selected.merge.label}. Available and Out of
                  service split the arrangement.
                </p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Seat capacity</p>
              {selected.merge ? (
                <p className="font-heading text-2xl font-semibold tabular-nums">
                  {selected.merge.seats}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {selected.merge.memberLabels
                      .map((label) => {
                        const member = tables.find((row) => row.label === label)
                        return `${label} (${member?.seats ?? "?"})`
                      })
                      .join(" + ")}
                  </span>
                </p>
              ) : (
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
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Expected time</p>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustExpected(selected.id, -EXPECTED_MINUTES_STEP)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-16 text-center font-heading text-2xl font-semibold tabular-nums">
                  {selected.merge?.expectedMinutes ?? selected.expectedMinutes}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">min</span>
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustExpected(selected.id, EXPECTED_MINUTES_STEP)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {selected.merge ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {formatDurationMinutes(remainingMinutes(selected.merge.expiresAt, new Date()))} left
                  on this arrangement
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Max / expected turn time. Merges last this long by default.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Merge tables</p>
              {selected.merge ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {selected.merge.label} · {selected.merge.seats} seats ·{" "}
                    {formatDurationMinutes(selected.merge.expectedMinutes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drop another available table on this group to add it.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => void splitSelected()}>
                    <Unlink className="size-4" /> Split tables
                  </Button>
                </div>
              ) : selectedMergeable ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Drag this table onto another available table to merge. The picker
                    below is a fallback.
                  </p>
                  {mergePartners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No other available tables to merge right now.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {mergePartners.map((table) => {
                        const picked = mergePick.includes(table.id)
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => toggleMergePick(table.id)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-sm font-medium transition-colors",
                              picked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {table.label} · {table.seats}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={mergePick.length === 0 || merging}
                    onClick={() => void combineSelected()}
                  >
                    <Combine className="size-4" /> Merge tables
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only available tables without a reservation can be merged. Drag one
                  onto another on the floor.
                </p>
              )}
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
            Select a table to edit its status, expected time, and capacity.
          </p>
        )}
      </div>
    </div>
  )
}

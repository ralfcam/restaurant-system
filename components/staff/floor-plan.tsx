"use client"

import { useMemo, useRef, useState, type PointerEvent } from "react"
import { Plus, Trash2, Minus, Users, Armchair, Clock, Combine, Unlink, Lock, LockOpen, Pencil } from "lucide-react"
import { toast } from "sonner"
import {
  TABLE_STATUS_META,
  type TableStatus,
} from "@/lib/data"
import { updateSlotIntervalMinutes } from "@/app/actions/branding"
import {
  ALLOWED_SLOT_INTERVALS,
  clampSlotIntervalMinutes,
  DEFAULT_SLOT_INTERVAL_MINUTES,
  type SlotIntervalMinutes,
} from "@/lib/reservations/operating-hours"
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
  isDragMergeable,
  isDragSplittable,
  resolveMergeDrop,
  resolveSplitDrop,
  type MergeDropTable,
} from "@/lib/floor/merge-drop"
import {
  FLOOR_CELL_PX,
  FLOOR_DRAG_THRESHOLD_PX,
  clientToFloorCell,
  floorCanvasCells,
  floorCellStyle,
  mergeCellBounds,
  spreadOverlappingTables,
  tableAtCell,
  type FloorCell,
} from "@/lib/floor/layout"
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

type FloorDrag = {
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  origin: FloorCell
  moved: boolean
}

export function FloorPlan({
  date,
  fallbackData,
  initialSlotInterval = DEFAULT_SLOT_INTERVAL_MINUTES,
}: {
  date: string
  fallbackData?: FloorSnapshot
  initialSlotInterval?: SlotIntervalMinutes
}) {
  const { tables: loadedTables, reservations, mutate, isValidating } = useFloorPlan(date, fallbackData)
  const tables = useMemo(() => spreadOverlappingTables(loadedTables), [loadedTables])
  const [selectedId, setSelectedId] = useState<string | null>(
    fallbackData?.tables[0]?.id ?? null,
  )
  const [seating, setSeating] = useState(false)
  const [mergePick, setMergePick] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<TableStatus | "all">("all")
  const [editMode, setEditMode] = useState(false)
  const [merging, setMerging] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [slotInterval, setSlotInterval] = useState<SlotIntervalMinutes>(
    clampSlotIntervalMinutes(initialSlotInterval),
  )
  const [draftPositions, setDraftPositions] = useState<Record<string, FloorCell>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<FloorDrag | null>(null)
  const skipClickAfterDrag = useRef(false)

  const selected = tables.find((t) => t.id === selectedId) ?? tables[0] ?? null
  const totalSeats = tables.reduce((sum, table) => table.seats + sum, 0)
  const mergeCount = new Set(tables.flatMap((table) => (table.merge ? [table.merge.id] : []))).size

  const displayedTables = useMemo(
    () =>
      tables.map((table) => {
        const draft = draftPositions[table.id]
        return draft ? { ...table, x: draft.x, y: draft.y } : table
      }),
    [tables, draftPositions],
  )

  const groups = useMemo(() => groupTablesForDisplay(displayedTables), [displayedTables])
  const visibleIds = useMemo(
    () => new Set(tables.filter((table) => activeFilter === "all" || table.displayStatus === activeFilter).map((table) => table.id)),
    [tables, activeFilter],
  )
  const canvas = useMemo(() => floorCanvasCells(displayedTables), [displayedTables])
  const statusCounts = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, count: tables.filter((table) => table.displayStatus === status).length })),
    [tables],
  )
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
  const selectedUnlocked = selected ? unlockedIds.has(selected.id) : false

  function dropKeyFor(table: (typeof tables)[number]) {
    return table.merge ? `merge:${table.merge.id}` : table.id
  }

  function cellOf(table: { id: string; x: number; y: number }): FloorCell {
    return draftPositions[table.id] ?? { x: table.x, y: table.y }
  }

  function clearDraft(id: string) {
    setDraftPositions((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function toggleUnlock(id: string) {
    setUnlockedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function lockTable(id: string) {
    setUnlockedIds((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

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

  async function persistSlotInterval(minutes: SlotIntervalMinutes) {
    const previous = slotInterval
    setSlotInterval(minutes)
    try {
      const result = await updateSlotIntervalMinutes(minutes)
      if (result.error) {
        setSlotInterval(previous)
        toast.error(result.error)
      }
    } catch {
      setSlotInterval(previous)
      toast.error("Could not save slot interval")
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
      lockTable(id)
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
      if ("error" in arrangement) {
        toast.error("Could not merge tables", { description: arrangement.error })
        return
      }
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

  async function persistPosition(id: string, cell: FloorCell) {
    try {
      await updateTableState({ id, x: cell.x, y: cell.y })
      await mutate()
    } catch {
      toast.error("Could not move table")
    } finally {
      clearDraft(id)
    }
  }

  function pointerCell(event: PointerEvent<HTMLElement>): FloorCell | null {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return clientToFloorCell(event.clientX, event.clientY, rect)
  }

  function onChipPointerDown(table: (typeof tables)[number], event: PointerEvent<HTMLButtonElement>) {
    if (!unlockedIds.has(table.id) || merging) return
    if ((event.target as HTMLElement).closest("[data-floor-lock]")) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const origin = cellOf(table)
    dragRef.current = {
      id: table.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin,
      moved: false,
    }
    setDraggingId(table.id)
  }

  function onChipPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const distance = Math.hypot(
      event.clientX - drag.startClientX,
      event.clientY - drag.startClientY,
    )
    if (!drag.moved && distance < FLOOR_DRAG_THRESHOLD_PX) return
    if (!drag.moved) {
      drag.moved = true
      skipClickAfterDrag.current = true
    }
    const cell = pointerCell(event)
    if (!cell) return
    setDraftPositions((current) => ({ ...current, [drag.id]: cell }))
    const occupant = tableAtCell(cell, displayedTables, drag.id)
    setDropTargetKey(occupant ? dropKeyFor(occupant) : null)
  }

  async function finishPointerDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDraggingId(null)
    setDropTargetKey(null)

    if (!drag.moved) {
      clearDraft(drag.id)
      return
    }

    lockTable(drag.id)
    const cell = pointerCell(event) ?? draftPositions[drag.id] ?? drag.origin
    const occupant = tableAtCell(cell, displayedTables, drag.id)

    if (occupant) {
      const result = resolveMergeDrop(drag.id, occupant.id, dropTables)
      clearDraft(drag.id)
      if (!result.tableIds) {
        toast.error("Could not merge tables", { description: result.error })
        return
      }
      await combineTables(result.tableIds)
      return
    }

    if (cell.x === drag.origin.x && cell.y === drag.origin.y) {
      clearDraft(drag.id)
      return
    }

    const source = dropTables.find((table) => table.id === drag.id)
    if (source && isDragSplittable(source)) {
      const split = resolveSplitDrop(drag.id, dropTables)
      if (!split.mergeId) {
        clearDraft(drag.id)
        toast.error("Could not split tables", { description: split.error })
        return
      }
      const sourceTable = tables.find((table) => table.id === drag.id)
      const splitOk = await splitArrangement(split.mergeId, sourceTable?.merge?.label)
      if (!splitOk) {
        clearDraft(drag.id)
        return
      }
    }

    await persistPosition(drag.id, cell)
  }

  async function splitArrangement(mergeId: string, label?: string) {
    try {
      const result = await splitMerge(mergeId)
      if (result.error) {
        toast.error("Could not split tables", { description: result.error })
        return false
      }
      await mutate()
      toast.success(`Split tables ${label ?? ""}`.trim())
      return true
    } catch (error) {
      toast.error("Could not split tables", {
        description: error instanceof Error ? error.message : undefined,
      })
      return false
    }
  }

  async function splitSelected() {
    if (!selected?.merge) return
    await splitArrangement(selected.merge.id, selected.merge.label)
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
            <div className="flex flex-wrap items-center gap-2">
              <div
                data-testid="slot-interval-control"
                role="group"
                aria-labelledby="slot-interval-label"
                className="flex items-center gap-1.5"
              >
                <span
                  id="slot-interval-label"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Slot interval
                </span>
                {ALLOWED_SLOT_INTERVALS.map((minutes) => (
                  <Button
                    key={minutes}
                    size="sm"
                    variant={slotInterval === minutes ? "default" : "outline"}
                    aria-pressed={slotInterval === minutes}
                    onClick={() => void persistSlotInterval(minutes)}
                  >
                    {minutes}
                  </Button>
                ))}
              </div>
              {unlockedIds.size > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setUnlockedIds(new Set())}>
                  <Lock className="size-4" /> Lock all
                </Button>
              ) : null}
              <Button size="sm" onClick={addTable}>
                <Plus className="size-4" /> Add table
              </Button>
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filter tables by status">
            <button type="button" onClick={() => setActiveFilter("all")} className={cn("min-w-24 rounded-lg border px-3 py-2 text-left text-xs font-medium", activeFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>
              <span className="block text-base font-semibold tabular-nums">{tables.length}</span>All tables
            </button>
            {statusCounts.map(({ status, count }) => (
              <button key={status} type="button" onClick={() => setActiveFilter(status)} className={cn("min-w-24 rounded-lg border px-3 py-2 text-left text-xs font-medium", activeFilter === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>
                <span className="block text-base font-semibold tabular-nums">{count}</span>{TABLE_STATUS_META[status].label}
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <p className="flex-1">{editMode ? "Edit mode is on. Unlock a table to drag it, then lock it again when you are done." : "Service mode is on. Select tables to manage the dining room; positions are protected."}</p>
            <Button size="sm" variant={editMode ? "default" : "outline"} onClick={() => { setEditMode((value) => !value); if (editMode) setUnlockedIds(new Set()) }}>
              <Pencil data-icon="inline-start" /> {editMode ? "Done" : "Edit layout"}
            </Button>
          </div>
          <div className="overflow-auto rounded-lg border border-dashed border-border bg-secondary/30 p-3">
            <div
              ref={canvasRef}
              className="relative"
              style={{
                width: canvas.cols * FLOOR_CELL_PX,
                height: canvas.rows * FLOOR_CELL_PX,
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px)",
                backgroundSize: `${FLOOR_CELL_PX}px ${FLOOR_CELL_PX}px`,
              }}
            >
              {groups.map((group) => {
                const merge = group.tables[0]?.merge
                if (!merge) return null
                const bounds = mergeCellBounds(group.tables)
                if (!bounds) return null
                const groupDropKey = `merge:${merge.id}`
                return (
                  <div
                    key={merge.id}
                    role="group"
                    aria-label={`Merged tables ${merge.label}, ${merge.seats} seats`}
                    className={cn(
                      "pointer-events-none absolute rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5",
                      dropTargetKey === groupDropKey
                        ? "border-accent bg-accent/10 ring-2 ring-accent ring-offset-2 ring-offset-card"
                        : null,
                    )}
                    style={bounds}
                  >
                    <div className="absolute bottom-1 left-2 text-[10px] leading-tight text-muted-foreground">
                      <p className="font-medium text-foreground">{merge.seats} seats</p>
                      <p className="flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {formatDurationMinutes(remainingMinutes(merge.expiresAt, new Date()))} left
                      </p>
                    </div>
                  </div>
                )
              })}

              {displayedTables.filter((t) => visibleIds.has(t.id)).map((t) => {
                const meta = TABLE_STATUS_META[t.displayStatus]
                const isSelected = t.id === (selected?.id ?? selectedId)
                const silhouette = tableShapeForSeats(t.seats)
    const unlocked = editMode && unlockedIds.has(t.id)
    const canMove = editMode && unlocked && !merging
                const targetKey = dropKeyFor(t)
                const isDropTarget = dropTargetKey === targetKey
                const cell = { x: t.x, y: t.y }
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "absolute flex items-center justify-center",
                      draggingId === t.id || isDropTarget || isSelected ? "z-20" : "z-10",
                    )}
                    style={{
                      ...floorCellStyle(cell),
                      width: FLOOR_CELL_PX,
                      height: FLOOR_CELL_PX,
                    }}
                  >
                    <span
                      data-floor-lock
                      data-testid="floor-move-lock"
                      role="button"
                      tabIndex={0}
                      aria-label={unlocked ? `Lock table ${t.label}` : `Unlock table ${t.label}`}
                      title={unlocked ? "Lock this table" : "Unlock to rearrange"}
                      className={cn(
                        "absolute left-0.5 top-0.5 z-20 flex size-8 items-center justify-center rounded-full border-2 bg-card shadow-md",
                        unlocked
                          ? "border-accent text-accent"
                          : "border-foreground/30 text-foreground hover:border-foreground",
                      )}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleUnlock(t.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return
                        event.preventDefault()
                        event.stopPropagation()
                        toggleUnlock(t.id)
                      }}
                    >
                      {unlocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
                    </span>
                    <button
                      type="button"
                      title={
                        canMove
                          ? isDragSplittable(toMergeDropTable(t))
                            ? "Drag onto an empty cell to split, or onto another table to merge"
                            : "Drag to a new cell, or onto another available table to merge"
                          : "Unlock the padlock to rearrange this table"
                      }
                      onClick={() => {
                        if (skipClickAfterDrag.current) {
                          skipClickAfterDrag.current = false
                          return
                        }
                        setSelectedId(t.id)
                        setMergePick([])
                      }}
                      onPointerDown={(event) => onChipPointerDown(t, event)}
                      onPointerMove={onChipPointerMove}
                      onPointerUp={(event) => {
                        void finishPointerDrag(event)
                      }}
                      onPointerCancel={(event) => {
                        const drag = dragRef.current
                        if (!drag || drag.pointerId !== event.pointerId) return
                        dragRef.current = null
                        setDraggingId(null)
                        setDropTargetKey(null)
                        clearDraft(drag.id)
                      }}
                      className={cn(
                        "relative flex flex-col items-center justify-center border-2 text-center transition-shadow duration-200 ease-out",
                        silhouette === "round" ? "rounded-full" : "rounded-lg",
                        tableChipSizeClass(t.seats),
                        meta.color,
                        canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        draggingId === t.id ? "opacity-80" : null,
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                          : "hover:brightness-95 hover:shadow-md",
                        isDropTarget
                          ? "ring-2 ring-accent ring-offset-2 ring-offset-card"
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
                  </div>
                )
              })}
            </div>
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
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      const assignedTable = row.table_label
                        ? tables.find((table) => table.label === row.table_label)
                        : null
                      if (assignedTable) setSelectedId(assignedTable.id)
                    }}
                    disabled={!row.table_label}
                    title={row.table_label ? "Focus table" : "Waiting for table assignment"}
                  >
                    <p className="truncate text-sm font-medium">{row.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Party of {row.party_size}
                      {row.table_label ? ` · Table ${row.table_label}` : " · waiting for a table"}
                    </p>
                  </button>
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
              <p className="mb-2 text-sm font-medium">Position</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toggleUnlock(selected.id)}
              >
                {selectedUnlocked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                {selectedUnlocked ? "Lock position" : "Unlock to move"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Cell {selected.x + 1}, {selected.y + 1}. Unlock, then drag on the floor plan.
              </p>
            </div>

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
                    Unlock a member and drag it onto an empty cell to split, or
                    drop another available table here to add it.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => void splitSelected()}>
                    <Unlink className="size-4" /> Split tables
                  </Button>
                </div>
              ) : selectedMergeable ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Unlock this table, then drag it onto another available table to merge.
                    The picker below is a fallback.
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
                  Only available tables without a reservation can be merged. Unlock one
                  and drop it onto another on the floor.
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

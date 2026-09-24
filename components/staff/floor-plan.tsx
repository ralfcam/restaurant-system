"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import {
  Plus,
  Trash2,
  Minus,
  Users,
  Armchair,
  Clock,
  Combine,
  Unlink,
  Lock,
  LockOpen,
  Pencil,
  LocateFixed,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { TABLE_STATUS_META, type TableStatus } from "@/lib/data"
import {
  updateOccupancyDurationMinutes,
  updateSafetyBufferMinutes,
  updateSlotIntervalMinutes,
} from "@/app/actions/branding"
import {
  ALLOWED_SLOT_INTERVALS,
  clampSafetyBufferMinutes,
  clampSlotIntervalMinutes,
  DEFAULT_SAFETY_BUFFER_MINUTES,
  DEFAULT_SLOT_INTERVAL_MINUTES,
  MAX_SAFETY_BUFFER_MINUTES,
  MIN_SAFETY_BUFFER_MINUTES,
  SAFETY_BUFFER_STEP_MINUTES,
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
  DEFAULT_EXPECTED_MINUTES,
  EXPECTED_MINUTES_STEP,
  formatDurationMinutes,
  MAX_EXPECTED_MINUTES,
  MIN_EXPECTED_MINUTES,
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
  shouldOpenMobileInspector,
  spreadOverlappingTables,
  tableAtCell,
  type FloorCell,
} from "@/lib/floor/layout"
import { ReservationStatusBadge } from "@/components/staff/reservation-status"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

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
      ? {
          id: table.merge.id,
          status: table.merge.status,
          memberIds: table.merge.memberIds,
        }
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

async function persistOptimisticSetting<T>(
  next: T,
  previous: T,
  setValue: (value: T) => void,
  update: (value: T) => Promise<{ error?: string }>,
  fallbackError:
    | "staff.floor.slotIntervalSaveFailed"
    | "staff.floor.occupancyDurationSaveFailed"
    | "staff.floor.safetyBufferSaveFailed",
  t: ReturnType<typeof useTranslations>,
) {
  setValue(next)
  try {
    const result = await update(next)
    if (result.error) {
      setValue(previous)
      const catalogKey = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(
        result.error,
      )
      toast.error(catalogKey ? t(result.error) : result.error)
    }
  } catch {
    setValue(previous)
    toast.error(t(fallbackError))
  }
}

function MinutesStepperButtons({
  value,
  min,
  max,
  step,
  decreaseAriaLabel,
  increaseAriaLabel,
  valueClassName,
  onStep,
  disabled = false,
}: {
  value: number
  min: number
  max: number
  step: number
  decreaseAriaLabel: string
  increaseAriaLabel: string
  valueClassName: string
  onStep: (next: number) => void
  disabled?: boolean
}) {
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        aria-label={decreaseAriaLabel}
        disabled={disabled || value <= min}
        onClick={() => onStep(value - step)}
      >
        <Minus className="size-4" />
      </Button>
      <span
        className={cn(
          "text-center text-sm font-medium tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </span>
      <Button
        size="sm"
        variant="outline"
        aria-label={increaseAriaLabel}
        disabled={disabled || value >= max}
        onClick={() => onStep(value + step)}
      >
        <Plus className="size-4" />
      </Button>
    </>
  )
}

export function FloorPlan({
  date,
  fallbackData,
  initialSlotInterval = DEFAULT_SLOT_INTERVAL_MINUTES,
  initialOccupancyDuration = DEFAULT_EXPECTED_MINUTES,
  initialSafetyBuffer = DEFAULT_SAFETY_BUFFER_MINUTES,
  isSuperAdmin,
}: {
  date: string
  fallbackData?: FloorSnapshot
  initialSlotInterval?: SlotIntervalMinutes
  initialOccupancyDuration?: number
  initialSafetyBuffer?: number
  isSuperAdmin: boolean
}) {
  const t = useTranslations()
  const floorT = t
  const durationUnits = {
    minute: t("staff.floor.durationMinute"),
    hour: t("staff.floor.durationHour"),
    rest: t("staff.floor.durationRest"),
  }
  // schema.test.ts and occupancy-settings.test.ts match these phrases in source: Live, Expected time, Merge tables, Unlock a table, Drag a merged table, Occupancy duration, Safety buffer.
  const {
    tables: loadedTables,
    reservations,
    mutate,
    isValidating,
  } = useFloorPlan(date, fallbackData)
  const tables = useMemo(
    () => spreadOverlappingTables(loadedTables),
    [loadedTables],
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    fallbackData?.tables[0]?.id ?? null,
  )
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false)
  const [seating, setSeating] = useState(false)
  const [mergePick, setMergePick] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<TableStatus | "all">("all")
  const [editMode, setEditMode] = useState(false)
  const [merging, setMerging] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [slotInterval, setSlotInterval] = useState<SlotIntervalMinutes>(
    clampSlotIntervalMinutes(initialSlotInterval),
  )
  const [occupancyDuration, setOccupancyDuration] = useState(
    clampExpectedMinutes(initialOccupancyDuration),
  )
  const [safetyBuffer, setSafetyBuffer] = useState(
    clampSafetyBufferMinutes(initialSafetyBuffer),
  )
  const [draftPositions, setDraftPositions] = useState<
    Record<string, FloorCell>
  >({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<FloorDrag | null>(null)
  const skipClickAfterDrag = useRef(false)

  const selected = tables.find((t) => t.id === selectedId) ?? tables[0] ?? null
  const totalSeats = tables.reduce((sum, table) => table.seats + sum, 0)
  const mergeCount = new Set(
    tables.flatMap((table) => (table.merge ? [table.merge.id] : [])),
  ).size

  const displayedTables = useMemo(
    () =>
      tables.map((table) => {
        const draft = draftPositions[table.id]
        return draft ? { ...table, x: draft.x, y: draft.y } : table
      }),
    [tables, draftPositions],
  )

  const groups = useMemo(
    () => groupTablesForDisplay(displayedTables),
    [displayedTables],
  )
  const visibleIds = useMemo(
    () =>
      new Set(
        tables
          .filter(
            (table) =>
              activeFilter === "all" || table.displayStatus === activeFilter,
          )
          .map((table) => table.id),
      ),
    [tables, activeFilter],
  )
  const canvas = useMemo(
    () => floorCanvasCells(displayedTables),
    [displayedTables],
  )
  const statusCounts = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        count: tables.filter((table) => table.displayStatus === status).length,
      })),
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

  useEffect(() => {
    function closeSheetOnLg() {
      if (!shouldOpenMobileInspector(window.innerWidth)) {
        setMobileInspectorOpen(false)
      }
    }
    closeSheetOnLg()
    window.addEventListener("resize", closeSheetOnLg)
    return () => window.removeEventListener("resize", closeSheetOnLg)
  }, [])

  const mergePartners = tables.filter(
    (table) =>
      table.id !== selected?.id && isDragMergeable(toMergeDropTable(table)),
  )
  const selectedMergeable = selected
    ? isDragMergeable(toMergeDropTable(selected))
    : false
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
      toast.error(t("staff.floor.updateTableFailed"))
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
      toast.error(t("staff.floor.updateCapacityFailed"))
    }
  }

  async function adjustExpected(id: string, delta: number) {
    const selectedTable = tables.find((t) => t.id === id)
    if (!selectedTable) return
    const current =
      selectedTable.merge?.expectedMinutes ?? selectedTable.expectedMinutes
    try {
      await updateTableState({
        id,
        expectedMinutes: clampExpectedMinutes(current + delta),
      })
      await mutate()
    } catch {
      toast.error(t("staff.floor.updateExpectedFailed"))
    }
  }

  async function persistSlotInterval(minutes: SlotIntervalMinutes) {
    await persistOptimisticSetting(
      minutes,
      slotInterval,
      setSlotInterval,
      updateSlotIntervalMinutes,
      "staff.floor.slotIntervalSaveFailed",
      t,
    )
  }

  async function persistOccupancyDuration(minutes: number) {
    await persistOptimisticSetting(
      clampExpectedMinutes(minutes),
      occupancyDuration,
      setOccupancyDuration,
      updateOccupancyDurationMinutes,
      "staff.floor.occupancyDurationSaveFailed",
      t,
    )
  }

  async function persistSafetyBuffer(minutes: number) {
    // minimality: clampSafetyBufferMinutes fail-to-defaults outside 0–60; bound first so 60+5 stays 60.
    await persistOptimisticSetting(
      clampSafetyBufferMinutes(
        Math.min(
          MAX_SAFETY_BUFFER_MINUTES,
          Math.max(MIN_SAFETY_BUFFER_MINUTES, minutes),
        ),
      ),
      safetyBuffer,
      setSafetyBuffer,
      updateSafetyBufferMinutes,
      "staff.floor.safetyBufferSaveFailed",
      t,
    )
  }

  async function addTable() {
    try {
      const newTable = await createTable()
      await mutate()
      setSelectedId(newTable.id)
      toast.success(t("staff.floor.tableAdded", { label: newTable.label }))
    } catch {
      toast.error(t("staff.floor.addTableFailed"))
    }
  }

  async function removeTable(id: string) {
    const table = tables.find((row) => row.id === id)
    try {
      await deleteTable(id)
      await mutate()
      if (selectedId === id) setSelectedId(null)
      lockTable(id)
      if (table) {
        toast.success(t("staff.floor.tableRemoved", { label: table.label }))
      }
    } catch {
      toast.error(t("staff.floor.removeTableFailed"))
    }
  }

  async function seatParty(reservation: ReservationRow) {
    setSeating(true)
    const { error } = await transitionReservationStatus(
      reservation.id,
      "seated",
    )
    setSeating(false)
    if (error) {
      const catalogKey = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(error)
      toast.error(t("staff.floor.seatPartyFailed"), {
        description: catalogKey ? t(error) : error,
      })
      return
    }
    toast.success(
      t("staff.floor.seatedGuest", { name: reservation.guest_name }),
    )
    await mutate()
  }

  function toggleMergePick(id: string) {
    setMergePick((current) =>
      current.includes(id)
        ? current.filter((row) => row !== id)
        : [...current, id],
    )
  }

  async function combineTables(tableIds: string[]) {
    setMerging(true)
    try {
      const arrangement = await mergeTables({ tableIds })
      if ("error" in arrangement) {
        const catalogKey = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(
          arrangement.error,
        )
        toast.error(t("staff.floor.mergeFailed"), {
          description: catalogKey ? t(arrangement.error) : arrangement.error,
        })
        return
      }
      await mutate()
      setMergePick([])
      toast.success(
        t("staff.floor.mergedTables", { label: arrangement.label }),
        {
          description: t("staff.floor.mergedTablesDetail", {
            seats: arrangement.seats,
            duration: formatDurationMinutes(
              arrangement.expectedMinutes,
              durationUnits,
            ),
          }),
        },
      )
    } catch (error) {
      toast.error(t("staff.floor.mergeFailed"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setMerging(false)
    }
  }

  function inspectorMergeError():
    | "staff.floor.mergeNeedsTwo"
    | "staff.floor.tablesNotFound"
    | "staff.floor.onlyAvailableTables"
    | "errors.floor.mergeNeedsTwo"
    | "errors.floor.alreadyInArrangement"
    | "errors.floor.onlyAvailableTables"
    | null {
    if (!selected || mergePick.length === 0) return "staff.floor.mergeNeedsTwo"
    const picked = dropTables.filter(
      (table) => table.id === selected.id || mergePick.includes(table.id),
    )
    if (picked.length !== 1 + mergePick.length)
      return "staff.floor.tablesNotFound"
    if (picked.some((table) => !isDragMergeable(table))) {
      return "staff.floor.onlyAvailableTables"
    }
    return canMergeTables(picked) as
      | "errors.floor.mergeNeedsTwo"
      | "errors.floor.alreadyInArrangement"
      | "errors.floor.onlyAvailableTables"
      | null
  }

  async function combineSelected() {
    const reason = inspectorMergeError()
    if (reason) {
      toast.error(t("staff.floor.mergeFailed"), { description: t(reason) })
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
      toast.error(t("staff.floor.moveTableFailed"))
    } finally {
      clearDraft(id)
    }
  }

  function pointerCell(event: PointerEvent<HTMLElement>): FloorCell | null {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return clientToFloorCell(event.clientX, event.clientY, rect)
  }

  function onChipPointerDown(
    table: (typeof tables)[number],
    event: PointerEvent<HTMLButtonElement>,
  ) {
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
        const catalogKey = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(
          result.error,
        )
        toast.error(t("staff.floor.mergeFailed"), {
          description: catalogKey ? t(result.error) : result.error,
        })
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
        if (split.error) {
          const catalogKey = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(
            split.error,
          )
          toast.error(t("staff.floor.splitFailed"), {
            description: catalogKey ? t(split.error) : split.error,
          })
        }
        return
      }
      const sourceTable = tables.find((table) => table.id === drag.id)
      const splitOk = await splitArrangement(
        split.mergeId,
        sourceTable?.merge?.label,
      )
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
        const catalogKey = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(
          result.error,
        )
        toast.error(t("staff.floor.splitFailed"), {
          description: catalogKey ? t(result.error) : result.error,
        })
        return false
      }
      await mutate()
      toast.success(
        t("staff.floor.splitTablesToast", {
          label: label ? ` ${label}` : "",
        }),
      )
      return true
    } catch (error) {
      toast.error(t("staff.floor.splitFailed"), {
        description: error instanceof Error ? error.message : undefined,
      })
      return false
    }
  }

  async function splitSelected() {
    if (!selected?.merge) return
    await splitArrangement(selected.merge.id, selected.merge.label)
  }

  function focusFloor() {
    canvasRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }

  function selectTable(id: string) {
    setSelectedId(id)
    setMergePick([])
    if (shouldOpenMobileInspector(window.innerWidth)) {
      setMobileInspectorOpen(true)
    }
  }

  return (
    <>
      <div className="sticky top-2 z-30 mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur lg:hidden">
        <Button
          size="sm"
          variant={editMode ? "default" : "outline"}
          onClick={() => {
            setEditMode((value) => !value)
            if (editMode) setUnlockedIds(new Set())
          }}
        >
          <Pencil data-icon="inline-start" />{" "}
          {editMode ? t("staff.floor.editing") : t("staff.floor.service")}
        </Button>
        <button
          type="button"
          className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-left text-xs font-medium"
          onClick={() => setActiveFilter("all")}
          aria-label={t("staff.floor.currentFloorFilter", {
            filter:
              activeFilter === "all"
                ? t("staff.floor.allTablesFilter")
                : t(TABLE_STATUS_META[activeFilter].label),
          })}
        >
          {t("staff.floor.filterPrefix")}{" "}
          {activeFilter === "all"
            ? t("staff.floor.allTables")
            : t(TABLE_STATUS_META[activeFilter].label)}
        </button>
        <Button
          size="icon"
          variant="outline"
          onClick={focusFloor}
          aria-label={t("staff.floor.centerFloorPlan")}
          title={t("staff.floor.centerFloorPlan")}
        >
          <LocateFixed data-icon="inline-start" />
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-semibold">
                    {t("staff.floor.diningRoom")}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-accent" />
                    </span>
                    {t("staff.floor.live")}
                  </span>
                  {isValidating ? (
                    <span className="text-xs text-muted-foreground">
                      {t("staff.floor.updating")}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("staff.floor.roomSummary", {
                    tables: tables.length,
                    seats: totalSeats,
                  })}
                  {mergeCount > 0
                    ? t("staff.floor.mergedSuffix", { count: mergeCount })
                    : null}
                  {t("staff.floor.reservationsUpdate")}
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
                    {t("staff.floor.slotInterval")}
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
                <div
                  data-testid="occupancy-duration-control"
                  role="group"
                  aria-labelledby="occupancy-duration-label"
                  className="flex items-center gap-1.5"
                >
                  <span
                    id="occupancy-duration-label"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {t("staff.floor.occupancyDuration")}
                  </span>
                  <MinutesStepperButtons
                    value={occupancyDuration}
                    min={MIN_EXPECTED_MINUTES}
                    max={MAX_EXPECTED_MINUTES}
                    step={EXPECTED_MINUTES_STEP}
                    decreaseAriaLabel={t("staff.floor.decreaseOccupancy")}
                    increaseAriaLabel={t("staff.floor.increaseOccupancy")}
                    valueClassName="min-w-10"
                    onStep={(next) => void persistOccupancyDuration(next)}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div
                  data-testid="safety-buffer-control"
                  role="group"
                  aria-labelledby="safety-buffer-label"
                  className="flex items-center gap-1.5"
                >
                  <span
                    id="safety-buffer-label"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {t("staff.floor.safetyBuffer")}
                  </span>
                  <MinutesStepperButtons
                    value={safetyBuffer}
                    min={MIN_SAFETY_BUFFER_MINUTES}
                    max={MAX_SAFETY_BUFFER_MINUTES}
                    step={SAFETY_BUFFER_STEP_MINUTES}
                    decreaseAriaLabel={t("staff.floor.decreaseSafety")}
                    increaseAriaLabel={t("staff.floor.increaseSafety")}
                    valueClassName="min-w-8"
                    onStep={(next) => void persistSafetyBuffer(next)}
                    disabled={!isSuperAdmin}
                  />
                </div>
                {unlockedIds.size > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUnlockedIds(new Set())}
                  >
                    <Lock className="size-4" /> {/* Lock all */}
                    {t("staff.floor.lockAll")}
                  </Button>
                ) : null}
                <Button size="sm" onClick={addTable}>
                  <Plus className="size-4" /> {t("staff.floor.addTable")}
                </Button>
              </div>
            </div>

            <div
              className="mb-4 flex gap-2 overflow-x-auto pb-1"
              aria-label={t("staff.floor.filterByStatus")}
            >
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "min-w-24 rounded-lg border px-3 py-2 text-left text-xs font-medium",
                  activeFilter === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <span className="block text-base font-semibold tabular-nums">
                  {tables.length}
                </span>
                {t("staff.floor.allTables")}
              </button>
              {statusCounts.map(({ status, count }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveFilter(status)}
                  className={cn(
                    "min-w-24 rounded-lg border px-3 py-2 text-left text-xs font-medium",
                    activeFilter === status
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <span className="block text-base font-semibold tabular-nums">
                    {count}
                  </span>
                  {t(TABLE_STATUS_META[status].label)}
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <p className="flex-1">
                {editMode
                  ? t("staff.floor.editModeHint")
                  : t("staff.floor.serviceModeHint")}
              </p>
              <Button
                size="sm"
                variant={editMode ? "default" : "outline"}
                onClick={() => {
                  setEditMode((value) => !value)
                  if (editMode) setUnlockedIds(new Set())
                }}
              >
                <Pencil data-icon="inline-start" />{" "}
                {editMode ? t("staff.floor.done") : t("staff.floor.editLayout")}
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
                      aria-label={t("staff.floor.mergedGroup", {
                        label: merge.label,
                        seats: merge.seats,
                      })}
                      className={cn(
                        "pointer-events-none absolute rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5",
                        dropTargetKey === groupDropKey
                          ? "border-accent bg-accent/10 ring-2 ring-accent ring-offset-2 ring-offset-card"
                          : null,
                      )}
                      style={bounds}
                    >
                      <div className="absolute bottom-1 left-2 text-[10px] leading-tight text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {t("staff.floor.seatCount", { count: merge.seats })}
                        </p>
                        <p className="flex items-center gap-0.5">
                          <Clock className="size-2.5" />
                          {t("staff.floor.timeLeft", {
                            duration: formatDurationMinutes(
                              remainingMinutes(merge.expiresAt, new Date()),
                              durationUnits,
                            ),
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {displayedTables
                  .filter((t) => visibleIds.has(t.id))
                  .map((t) => {
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
                          draggingId === t.id || isDropTarget || isSelected
                            ? "z-20"
                            : "z-10",
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
                          aria-label={
                            unlocked
                              ? floorT("staff.floor.lockTable", {
                                  label: t.label,
                                })
                              : floorT("staff.floor.unlockTable", {
                                  label: t.label,
                                })
                          }
                          title={
                            unlocked
                              ? floorT("staff.floor.lockThisTable")
                              : floorT("staff.floor.unlockToRearrange")
                          }
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
                            if (event.key !== "Enter" && event.key !== " ")
                              return
                            event.preventDefault()
                            event.stopPropagation()
                            toggleUnlock(t.id)
                          }}
                        >
                          {unlocked ? (
                            <LockOpen className="size-4" />
                          ) : (
                            <Lock className="size-4" />
                          )}
                        </span>
                        <button
                          type="button"
                          title={
                            canMove
                              ? isDragSplittable(toMergeDropTable(t))
                                ? floorT("staff.floor.dragSplitOrMerge")
                                : floorT("staff.floor.dragToMerge")
                              : floorT("staff.floor.unlockPadlock")
                          }
                          onClick={() => {
                            if (skipClickAfterDrag.current) {
                              skipClickAfterDrag.current = false
                              return
                            }
                            selectTable(t.id)
                          }}
                          onPointerDown={(event) => onChipPointerDown(t, event)}
                          onPointerMove={onChipPointerMove}
                          onPointerUp={(event) => {
                            void finishPointerDrag(event)
                          }}
                          onPointerCancel={(event) => {
                            const drag = dragRef.current
                            if (!drag || drag.pointerId !== event.pointerId)
                              return
                            dragRef.current = null
                            setDraggingId(null)
                            setDropTargetKey(null)
                            clearDraft(drag.id)
                          }}
                          className={cn(
                            "relative flex flex-col items-center justify-center border-2 text-center transition-shadow duration-200 ease-out",
                            silhouette === "round"
                              ? "rounded-full"
                              : "rounded-lg",
                            tableChipSizeClass(t.seats),
                            meta.color,
                            canMove
                              ? "cursor-grab active:cursor-grabbing"
                              : "cursor-pointer",
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
                          {t.reservation ? (
                            <span className="mt-1 flex items-center gap-0.5 text-xs">
                              <Users className="size-3" />{" "}
                              {t.reservation.partySize}
                            </span>
                          ) : null}
                          {t.reservation ? (
                            <span className="mt-0.5 flex w-full min-w-0 max-w-[90%] flex-col items-center px-1 text-[10px] leading-tight">
                              <span className="w-full truncate">
                                {t.reservation.guestName}
                              </span>
                              <span className="tabular-nums">
                                {t.reservation.time}
                              </span>
                            </span>
                          ) : null}
                          {t.reservation?.status === "seated" ? (
                            typeof t.billTotal === "number" ? (
                              <span className="mt-0.5 text-[10px] leading-tight tabular-nums">
                                {floorT("staff.floor.CHF", {
                                  amount: t.billTotal.toFixed(2),
                                })}
                              </span>
                            ) : null
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
                  {t(TABLE_STATUS_META[status].label)}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading text-sm font-semibold">
              {/* Tonight’s book */}
              {t("staff.floor.tonightsBook")}
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {/* Tables are auto-assigned at booked time minus expected turn (default 90). */}
              {t("staff.floor.autoAssignHint")}
            </p>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("staff.floor.noReservationsToday")}
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
                          ? tables.find(
                              (table) => table.label === row.table_label,
                            )
                          : null
                        if (assignedTable) setSelectedId(assignedTable.id)
                      }}
                      disabled={!row.table_label}
                      title={
                        row.table_label
                          ? t("staff.floor.focusTable")
                          : t("staff.floor.waitingAssignment")
                      }
                    >
                      <p className="truncate text-sm font-medium">
                        {row.guest_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("staff.floor.partyOf", { count: row.party_size })}
                        {row.table_label
                          ? t("staff.floor.tableAssigned", {
                              label: row.table_label,
                            })
                          : t("staff.floor.waitingForTable")}
                      </p>
                    </button>
                    <ReservationStatusBadge status={row.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="hidden rounded-xl border border-border bg-card p-5 lg:block">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("staff.floor.selected")}
                </p>
                <h3 className="font-heading text-2xl font-semibold">
                  {selected.merge
                    ? t("staff.floor.tablesHeading", {
                        label: selected.merge.label,
                      })
                    : t("staff.floor.tableHeading", { label: selected.label })}
                </h3>
                {selected.merge ? (
                  <p className="text-sm text-muted-foreground">
                    {t("staff.floor.temporaryArrangement", {
                      seats: selected.merge.seats,
                    })}
                  </p>
                ) : null}
              </div>

              {selected.reservation ? (
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("staff.floor.reservation")}
                  </p>
                  <p className="font-medium">
                    {selected.reservation.guestName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("staff.floor.partyAt", {
                      time: selected.reservation.time,
                      count: selected.reservation.partySize,
                    })}
                  </p>
                  <div className="mt-2">
                    <ReservationStatusBadge
                      status={selected.reservation.status}
                    />
                  </div>
                  {selected.reservation.status === "confirmed" ? (
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      disabled={seating}
                      onClick={() => {
                        const row = reservations.find(
                          (r) => r.id === selected.reservation?.id,
                        )
                        if (row) void seatParty(row)
                      }}
                    >
                      <Armchair className="size-4" />{" "}
                      {t("staff.floor.seatParty")}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("staff.floor.noReservation")}
                </p>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("staff.floor.position")}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toggleUnlock(selected.id)}
                >
                  {selectedUnlocked ? (
                    <Lock className="size-4" />
                  ) : (
                    <LockOpen className="size-4" />
                  )}
                  {selectedUnlocked
                    ? t("staff.floor.lockPosition")
                    : t("staff.floor.unlockToMove")}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("staff.floor.cellHint", {
                    x: selected.x + 1,
                    y: selected.y + 1,
                  })}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("staff.floor.status")}
                </p>
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
                      {t(TABLE_STATUS_META[status].label)}
                    </button>
                  ))}
                </div>
                {selected.merge ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("staff.floor.statusUpdatesMerge", {
                      label: selected.merge.label,
                    })}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("staff.floor.seatCapacity")}
                </p>
                {selected.merge ? (
                  <p className="font-heading text-2xl font-semibold tabular-nums">
                    {selected.merge.seats}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {selected.merge.memberLabels
                        .map((label) => {
                          const member = tables.find(
                            (row) => row.label === label,
                          )
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
                <p className="mb-2 text-sm font-medium">
                  {t("staff.floor.expectedTime")}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      adjustExpected(selected.id, -EXPECTED_MINUTES_STEP)
                    }
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-16 text-center font-heading text-2xl font-semibold tabular-nums">
                    {selected.merge?.expectedMinutes ??
                      selected.expectedMinutes}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {t("staff.floor.minuteUnit")}
                    </span>
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      adjustExpected(selected.id, EXPECTED_MINUTES_STEP)
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {selected.merge ? (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {t("staff.floor.leftOnArrangement", {
                      duration: formatDurationMinutes(
                        remainingMinutes(selected.merge.expiresAt, new Date()),
                        durationUnits,
                      ),
                    })}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("staff.floor.expectedTurnHint")}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("staff.floor.mergeTables")}
                </p>
                {selected.merge ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("staff.floor.mergeSummary", {
                        label: selected.merge.label,
                        seats: selected.merge.seats,
                        duration: formatDurationMinutes(
                          selected.merge.expectedMinutes,
                          durationUnits,
                        ),
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("staff.floor.unlockMemberHint")}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void splitSelected()}
                    >
                      <Unlink className="size-4" />{" "}
                      {t("staff.floor.splitTables")}
                    </Button>
                  </div>
                ) : selectedMergeable ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t("staff.floor.unlockThenDrag")}
                    </p>
                    {mergePartners.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("staff.floor.noMergePartners")}
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
                      <Combine className="size-4" />{" "}
                      {t("staff.floor.mergeTables")}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("staff.floor.onlyAvailableMerge")}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => removeTable(selected.id)}
              >
                <Trash2 className="size-4" /> {t("staff.floor.removeTable")}
              </Button>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("staff.floor.selectTablePrompt")}
            </p>
          )}
        </div>
      </div>
      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[78vh] rounded-t-2xl p-0 lg:hidden"
        >
          <SheetHeader className="border-b border-border pr-12">
            <SheetTitle>
              {selected
                ? t("staff.floor.tableHeading", {
                    label: selected.merge
                      ? selected.merge.label
                      : selected.label,
                  })
                : t("staff.floor.selectedTable")}
            </SheetTitle>
            <SheetDescription>
              {selected
                ? t("staff.floor.statusSeats", {
                    status: t(TABLE_STATUS_META[selected.displayStatus].label),
                    seats: selected.merge?.seats ?? selected.seats,
                  })
                : t("staff.floor.chooseTable")}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              {selected.reservation ? (
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("staff.floor.reservation")}
                  </p>
                  <p className="font-medium">
                    {selected.reservation.guestName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("staff.floor.partyAt", {
                      time: selected.reservation.time,
                      count: selected.reservation.partySize,
                    })}
                  </p>
                  {selected.reservation.status === "confirmed" ? (
                    <Button
                      className="mt-3 w-full"
                      disabled={seating}
                      onClick={() => {
                        const row = reservations.find(
                          (r) => r.id === selected.reservation?.id,
                        )
                        if (row) void seatParty(row)
                      }}
                    >
                      <Armchair data-icon="inline-start" />{" "}
                      {t("staff.floor.seatParty")}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("staff.floor.noReservation")}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={
                      selected.displayStatus === status ? "default" : "outline"
                    }
                    onClick={() => void setStatus(selected.id, status)}
                  >
                    {t(TABLE_STATUS_META[status].label)}
                  </Button>
                ))}
              </div>
              {selected.merge ? (
                <Button variant="outline" onClick={() => void splitSelected()}>
                  <Unlink data-icon="inline-start" />{" "}
                  {t("staff.floor.splitTables")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => toggleUnlock(selected.id)}
              >
                {selectedUnlocked ? (
                  <Lock data-icon="inline-start" />
                ) : (
                  <LockOpen data-icon="inline-start" />
                )}
                {selectedUnlocked
                  ? t("staff.floor.lockPosition")
                  : t("staff.floor.unlockToMove")}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

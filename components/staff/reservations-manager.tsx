"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  Phone,
  Check,
  Armchair,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { createTranslator, useTranslations } from "next-intl"
import fr from "@/messages/fr.json"
import { toast } from "sonner"
import { TABLE_STATUS_META, type ReservationStatus } from "@/lib/data"
import { guestProfileHref } from "@/lib/guest-profiles"
import { staffListEmptyCopy } from "@/lib/reservations/list-empty-copy"
import { selectableTablesForAssignment } from "@/lib/reservations/selectable-tables"
import {
  type ReservationRow,
  type ReservationTableOption,
  assignReservationTable,
  getReservationTables,
  transitionReservationStatus,
  undoReservationStatus,
  getReservationsByDate,
} from "@/app/actions/reservations"
import {
  RESERVATION_STATUS_META,
  ReservationStatusBadge,
} from "@/components/staff/reservation-status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const staffT = createTranslator({ locale: "fr", messages: fr })

// Map DB row shape to a UI-friendly type
type Reservation = {
  id: string
  guestName: string
  partySize: number
  time: string
  date: string
  tableLabel?: string
  status: ReservationStatus
  phone: string
  email: string | null
  notes?: string
  confCode: string
}

function rowToReservation(r: ReservationRow): Reservation {
  return {
    id: r.id,
    guestName: r.guest_name,
    partySize: r.party_size,
    time: r.time,
    date: r.date,
    tableLabel: r.table_label ?? undefined,
    status: r.status,
    phone: r.phone,
    email: r.email ?? null,
    notes: r.notes ?? undefined,
    confCode: r.conf_code,
  }
}

type Tab = "all" | ReservationStatus

const TAB_VALUES: Tab[] = [
  "all",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
]

function offsetDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function ReservationsManager({
  initialReservations = [],
  selectedDate,
  today,
  occupancyWindow,
}: {
  initialReservations?: ReservationRow[]
  selectedDate?: string
  today?: string
  occupancyWindow: {
    occupancyDurationMinutes: number
    safetyBufferMinutes: number
  }
}) {
  const router = useRouter()
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()
  const currentDate = selectedDate ?? new Date().toISOString().slice(0, 10)
  const todayISO = today ?? new Date().toISOString().slice(0, 10)

  const [reservations, setReservations] = useState<Reservation[]>(
    initialReservations.map(rowToReservation),
  )
  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")
  const [loadingDate, setLoadingDate] = useState(false)
  const [tables, setTables] = useState<ReservationTableOption[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [listError, setListError] = useState<string | undefined>()

  useEffect(() => {
    getReservationTables().then(setTables)
  }, [])

  // Refetch whenever the admin navigates to a new date. The server action uses
  // the service-role client so RLS never filters out rows on the admin side.
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoadingDate(true)
    })
    getReservationsByDate(currentDate).then((result) => {
      if (!cancelled) {
        setReservations(result.reservations.map(rowToReservation))
        setListError(result.error)
        if (result.error) toast.error(t(result.error))
        setLoadingDate(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [currentDate, t])

  function navigateToDate(date: string) {
    startTransition(() => {
      router.push(`/admin/reservations?date=${date}`)
    })
  }

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

  async function assignTable(id: string, tableLabel: string) {
    const nextLabel = tableLabel || undefined
    const previous = reservations.find(
      (reservation) => reservation.id === id,
    )?.tableLabel
    setAssigningId(id)
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id
          ? { ...reservation, tableLabel: nextLabel }
          : reservation,
      ),
    )

    const { error } = await assignReservationTable(id, tableLabel || null)
    setAssigningId(null)
    if (error) {
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === id
            ? { ...reservation, tableLabel: previous }
            : reservation,
        ),
      )
      toast.error(t(error))
      return
    }
    toast.success(
      tableLabel
        ? t("staff.reservations.assignedToTable", { label: tableLabel })
        : t("staff.reservations.assignmentCleared"),
    )
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    // Optimistic update
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    )
    const previous = reservations.find((r) => r.id === id)?.status
    const { error } = await transitionReservationStatus(id, status)
    if (error) {
      toast.error(t("staff.reservations.updateFailed"), {
        description: t(error),
      })
      // Roll back optimistic update
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: previous ?? r.status } : r,
        ),
      )
      return
    }
    toast.success(t(RESERVATION_STATUS_META[status].label), {
      action: {
        label: t("staff.reservations.undo"),
        onClick: () => {
          void undoStatus(id, status)
        },
      },
    })
  }

  async function undoStatus(id: string, changedStatus: ReservationStatus) {
    const current = reservations.find((r) => r.id === id)
    if (!current || current.status !== changedStatus) {
      toast.error(t("staff.reservations.undoUnavailable"))
      return
    }
    const result = await undoReservationStatus(id)
    if (result.error || !result.restoredStatus) {
      toast.error(t("staff.reservations.undoFailed"), {
        description: result.error ? t(result.error) : undefined,
      })
      return
    }
    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: result.restoredStatus as ReservationStatus }
          : r,
      ),
    )
    toast.success(
      t(
        RESERVATION_STATUS_META[result.restoredStatus as ReservationStatus]
          .label,
      ),
    )
  }

  const tabLabels: Record<Tab, string> = {
    all: t("staff.reservations.tabAll"),
    confirmed: t("staff.reservations.tabConfirmed"),
    seated: t("staff.reservations.tabSeated"),
    completed: t("staff.reservations.tabCompleted"),
    cancelled: t("staff.reservations.tabCancelled"),
    no_show: t("staff.reservations.tabNoShow"),
  }

  return (
    <div>
      {/* Date navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateToDate(offsetDate(currentDate, -1))}
          disabled={isPending}
          title={t("staff.reservations.previousDay")}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">{t("staff.reservations.previousDay")}</span>
        </Button>
        <input
          type="date"
          value={currentDate}
          onChange={(e) => e.target.value && navigateToDate(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateToDate(offsetDate(currentDate, 1))}
          disabled={isPending}
          title={t("staff.reservations.nextDay")}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">{t("staff.reservations.nextDay")}</span>
        </Button>
        {currentDate !== todayISO && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToDate(todayISO)}
            disabled={isPending}
          >
            {t("staff.reservations.today")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => startTransition(() => router.refresh())}
          disabled={isPending}
          title={t("staff.reservations.refresh")}
        >
          <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
          <span className="sr-only">{t("staff.reservations.refresh")}</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TAB_VALUES.map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {tabLabels[value]}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("staff.reservations.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      <div
        className={cn(
          "mt-4 overflow-hidden rounded-xl border border-border bg-card transition-opacity",
          loadingDate && "opacity-50 pointer-events-none",
        )}
      >
        {/* Header row (desktop) */}
        <div className="hidden grid-cols-[80px_1fr_120px_120px_140px] gap-4 border-b border-border bg-secondary/50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>{t("staff.reservations.columnTime")}</span>
          <span>{t("staff.reservations.columnGuest")}</span>
          <span>{t("staff.reservations.columnParty")}</span>
          <span>{t("staff.reservations.columnTable")}</span>
          <span>{t("staff.reservations.columnStatus")}</span>
        </div>

        <ul className="divide-y divide-border">
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              {t(
                staffListEmptyCopy({
                  error: listError,
                  loadedCount: reservations.length,
                  filteredCount: filtered.length,
                  statusFilterActive: tab !== "all",
                  nameOrPhoneFilterActive: query.trim() !== "",
                }),
              )}
            </li>
          ) : (
            filtered.map((r) => {
              const fichaHref = guestProfileHref(r.email)
              return (
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
                    {r.email?.trim() ? (
                      <p className="text-sm text-muted-foreground">{r.email}</p>
                    ) : null}
                    {fichaHref ? (
                      <Link
                        href={fichaHref}
                        className="mt-0.5 inline-block text-xs text-primary hover:underline"
                      >
                        {t("staff.reservations.guestProfile")}
                      </Link>
                    ) : null}
                    {r.notes ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.notes}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm">
                    <span className="md:hidden text-muted-foreground">
                      {t("staff.reservations.partyPrefix")}{" "}
                    </span>
                    {r.partySize}{" "}
                    {t("staff.reservations.guests", { count: r.partySize })}
                  </span>
                  <TableAssignment
                    reservation={r}
                    tables={tables}
                    assigning={assigningId === r.id}
                    onAssign={assignTable}
                    reservations={reservations}
                    occupancyWindow={occupancyWindow}
                  />
                  <div className="flex items-center justify-between gap-2 md:justify-start">
                    <ReservationStatusBadge status={r.status} />
                    <ReservationActions
                      reservation={r}
                      onUpdate={updateStatus}
                    />
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("staff.reservations.showing", {
          shown: filtered.length,
          total: reservations.length,
        })}
      </p>
    </div>
  )
}

export function TableAssignment({
  reservation,
  tables,
  assigning,
  onAssign,
  reservations,
  occupancyWindow,
}: {
  reservation: Reservation
  tables: ReservationTableOption[]
  assigning: boolean
  onAssign: (id: string, tableLabel: string) => void
  reservations: Reservation[]
  occupancyWindow: {
    occupancyDurationMinutes: number
    safetyBufferMinutes: number
  }
}) {
  const t = staffT
  const assignTableFor = t("staff.reservations.assignTableFor", {
    name: reservation.guestName,
  })
  const selectableTables = selectableTablesForAssignment(
    tables,
    reservation.partySize,
    reservation.tableLabel,
    {
      candidate: {
        id: reservation.id,
        date: reservation.date,
        time: reservation.time,
      },
      occupying: reservations.map((row) => ({
        id: row.id,
        date: row.date,
        time: row.time,
        status: row.status,
        table_label: row.tableLabel || null,
      })),
      occupancyDurationMinutes: occupancyWindow.occupancyDurationMinutes,
      safetyBufferMinutes: occupancyWindow.safetyBufferMinutes,
    },
  )

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{assignTableFor}</span>
      <select
        value={reservation.tableLabel ?? ""}
        disabled={
          assigning ||
          reservation.status === "cancelled" ||
          reservation.status === "completed"
        }
        onChange={(event) => onAssign(reservation.id, event.target.value)}
        className="h-9 min-w-28 rounded-md border border-border bg-background px-2 text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={assignTableFor}
      >
        <option value="">{t("staff.reservations.unassigned")}</option>
        {selectableTables.map((table) => (
          <option key={table.id} value={table.label}>
            {t("staff.reservations.tableOption", {
              label: table.groupLabel ?? table.label,
              seats: table.seats,
            })}
            {table.status !== "available"
              ? t("staff.reservations.tableStatusSuffix", {
                  status: (t as (key: string) => string)(
                    TABLE_STATUS_META[table.status].label,
                  ),
                })
              : null}
          </option>
        ))}
      </select>
      {assigning ? (
        <RefreshCw
          className="size-3.5 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
    </label>
  )
}

function ReservationActions({
  reservation,
  onUpdate,
}: {
  reservation: Reservation
  onUpdate: (id: string, status: ReservationStatus) => void
}) {
  const t = useTranslations()
  if (reservation.status === "confirmed") {
    return (
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("staff.reservations.seatGuest")}
          onClick={() => onUpdate(reservation.id, "seated")}
        >
          <Armchair className="size-4" />
          <span className="sr-only">{t("staff.reservations.seat")}</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-destructive hover:text-destructive"
          title={t("staff.reservations.markNoShow")}
          onClick={() => onUpdate(reservation.id, "no_show")}
        >
          <X className="size-4" />
          <span className="sr-only">{t("staff.reservations.markNoShow")}</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-muted-foreground"
          title={t("staff.reservations.cancel")}
          onClick={() => onUpdate(reservation.id, "cancelled")}
        >
          <X className="size-4" />
          <span className="sr-only">{t("staff.reservations.cancel")}</span>
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
        title={t("staff.reservations.complete")}
        onClick={() => onUpdate(reservation.id, "completed")}
      >
        <Check className="size-4" />
        <span className="sr-only">{t("staff.reservations.complete")}</span>
      </Button>
    )
  }
  return null
}

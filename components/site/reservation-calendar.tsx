"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTodayInRestaurantTZ, getDayOfWeekInRestaurantTZ } from "@/lib/timezone"
import type { OperatingWindow } from "@/app/actions/availability"

// Safe fallback: Mon–Sat open, Sunday closed — matches the most common restaurant schedule
const FALLBACK_OPERATING_WINDOWS: Record<number, OperatingWindow> = {
  0: { day_of_week: 0, opens_at: "17:00", closes_at: "22:00", is_closed: true },  // Sunday — closed
  1: { day_of_week: 1, opens_at: "17:00", closes_at: "22:00", is_closed: false },
  2: { day_of_week: 2, opens_at: "17:00", closes_at: "22:00", is_closed: false },
  3: { day_of_week: 3, opens_at: "17:00", closes_at: "22:00", is_closed: false },
  4: { day_of_week: 4, opens_at: "17:00", closes_at: "22:00", is_closed: false },
  5: { day_of_week: 5, opens_at: "17:00", closes_at: "22:00", is_closed: false },
  6: { day_of_week: 6, opens_at: "17:00", closes_at: "22:00", is_closed: false },
}

interface ReservationCalendarProps {
  value: string
  onChange: (date: string) => void
  dark?: boolean
  /** Operating windows keyed by day_of_week (0=Sun…6=Sat). Null while loading. */
  operatingWindows?: Record<number, OperatingWindow> | null
  /** Explicitly blocked dates as YYYY-MM-DD strings. */
  blockedDates?: string[]
  /**
   * Admin mode: disables past-date blocking and renders blocked dates with a
   * danger style. Clicking any date fires onChange to toggle its blocked state.
   */
  adminMode?: boolean
}

export function ReservationCalendar({
  value,
  onChange,
  dark = false,
  operatingWindows,
  blockedDates = [],
  adminMode = false,
}: ReservationCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const date = value ? new Date(value + "T00:00:00") : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  // Resolve the effective operating windows — use prop if loaded, else fallback
  const effectiveWindows = operatingWindows ?? FALLBACK_OPERATING_WINDOWS

  // Build a Set of blocked dates for O(1) lookup
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates])

  // Compute disabled dates purely from props — no async work here.
  // adminMode bypasses past-date blocking but still respects is_closed days
  // so the grid correctly reflects live uncommitted switch state.
  const disabledDates = useMemo<Set<string>>(() => {
    const disabled = new Set<string>()
    const today = getTodayInRestaurantTZ()
    const todayDate = new Date(today + "T00:00:00")

    const startDate = new Date(viewMonth)
    startDate.setDate(1)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      // Use local date components — toISOString() converts to UTC which can
      // shift the date by ±1 day and cause the wrong DOW to be evaluated.
      const dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

      // Past dates — only blocked in guest mode, not admin mode
      if (!adminMode && d < todayDate) {
        disabled.add(dateISO)
        continue
      }

      // Explicitly blocked dates (admin overrides) — guest mode only;
      // in adminMode blocked dates are styled with danger but stay clickable
      if (!adminMode && blockedSet.has(dateISO)) {
        disabled.add(dateISO)
        continue
      }

      // Operating schedule always applies — uses timezone-safe DOW resolution.
      // In adminMode this makes closed days visually inactive (opacity-15
      // line-through) and unclickable, matching the baseline inactive aesthetic.
      const dow = getDayOfWeekInRestaurantTZ(dateISO)
      const win = effectiveWindows[dow]
      if (!win || win.is_closed) {
        disabled.add(dateISO)
      }
    }

    return disabled
  }, [adminMode, viewMonth, effectiveWindows, blockedSet])

  const handlePrevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Generate calendar grid
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const weeks: Date[][] = []
  let currentWeek: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  const monthName = firstDay.toLocaleString("default", { month: "long", year: "numeric" })

  return (
    <div className={cn(
      "rounded-sm border p-2",
      dark
        ? "border-white/15 bg-zinc-900"
        : "border-border/60 bg-white",
    )}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-sm transition-colors",
            dark
              ? "hover:bg-white/10 text-white/60 hover:text-white"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronLeft className="size-3" />
        </button>
        <h3 className={cn(
          "text-[11px] font-semibold tracking-wide flex-1 text-center",
          dark ? "text-white/90" : "text-foreground",
        )}>
          {monthName}
        </h3>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-sm transition-colors",
            dark
              ? "hover:bg-white/10 text-white/60 hover:text-white"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
          <div
            key={day}
            className={cn(
              "text-center text-[9px] font-semibold tracking-wide py-0.5",
              dark ? "text-white/60" : "text-foreground/60",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.map((week, weekIdx) =>
          week.map((date, dayIdx) => {
            // Build YYYY-MM-DD from local date components to avoid UTC timezone
            // shift — toISOString() converts to UTC first which can shift the
            // date by ±1 day in non-UTC environments.
            const yy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, "0")
            const dd = String(date.getDate()).padStart(2, "0")
            const dateISO = `${yy}-${mm}-${dd}`
            const isDisabled = disabledDates.has(dateISO)
            const isCurrentMonth = date.getMonth() === month
            const isSelected = value === dateISO
            const today = getTodayInRestaurantTZ()
            const isToday = dateISO === today

            const isBlocked = blockedSet.has(dateISO)
            // In adminMode, closed-by-schedule days are in disabledDates —
            // prevent toggleBlockedDate from firing for them since blocking
            // a permanently closed day is redundant and confusing.
            const isClosed = adminMode && disabledDates.has(dateISO) && !isBlocked

            return (
              <button
                key={`${weekIdx}-${dayIdx}`}
                type="button"
                onClick={() => { if (!isDisabled && !isClosed) onChange(dateISO) }}
                disabled={isDisabled}
                className={cn(
                  "w-6 h-6 text-[10px] font-medium rounded-sm transition-colors border",
                  "disabled:cursor-not-allowed disabled:opacity-15 disabled:line-through disabled:pointer-events-none",
                  isCurrentMonth ? "" : "opacity-30",
                  // Admin mode: blocked dates get danger highlight
                  adminMode && isBlocked && (
                    "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/60"
                  ),
                  // Normal selected state (only when not blocked in admin mode)
                  isSelected && !isDisabled && !(adminMode && isBlocked) && (dark
                    ? "border-white bg-white text-zinc-950 font-semibold"
                    : "border-foreground bg-foreground text-background font-semibold"
                  ),
                  isToday && !isSelected && !isDisabled && !(adminMode && isBlocked) && (dark
                    ? "border-white/50 bg-white/20 text-white font-semibold"
                    : "border-foreground/40 bg-foreground/8 text-foreground font-semibold"
                  ),
                  !isSelected && !isToday && !isDisabled && !(adminMode && isBlocked) && (dark
                    ? "border-white/20 text-white/80 hover:border-white/40 hover:bg-white/10"
                    : "border-border/60 text-foreground hover:border-foreground/40 hover:bg-secondary"
                  ),
                )}
              >
                {date.getDate()}
              </button>
            )
          })
        )}
      </div>

      {/* Show a subtle hint while the parent is still loading operating rules */}
      {!operatingWindows && (
        <div className={cn(
          "text-center text-[10px] mt-2 py-1",
          dark ? "text-white/40" : "text-foreground/40",
        )}>
          Loading schedule...
        </div>
      )}
    </div>
  )
}

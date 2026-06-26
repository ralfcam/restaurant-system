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
}

export function ReservationCalendar({
  value,
  onChange,
  dark = false,
  operatingWindows,
  blockedDates = [],
}: ReservationCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const date = value ? new Date(value + "T00:00:00") : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  // Resolve the effective operating windows — use prop if loaded, else fallback
  const effectiveWindows = operatingWindows ?? FALLBACK_OPERATING_WINDOWS

  // Build a Set of blocked dates for O(1) lookup
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates])

  // Compute disabled dates purely from props — no async work here
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
      const dateISO = d.toISOString().split("T")[0]

      // Past dates
      if (d < todayDate) {
        disabled.add(dateISO)
        continue
      }

      // Explicitly blocked dates (admin overrides)
      if (blockedSet.has(dateISO)) {
        disabled.add(dateISO)
        continue
      }

      // Dynamic operating schedule — uses timezone-safe day-of-week resolution
      const dow = getDayOfWeekInRestaurantTZ(dateISO)
      const window = effectiveWindows[dow]
      if (!window || window.is_closed) {
        disabled.add(dateISO)
      }
    }

    return disabled
  }, [viewMonth, effectiveWindows, blockedSet])

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
            const dateISO = date.toISOString().split("T")[0]
            const isDisabled = disabledDates.has(dateISO)
            const isCurrentMonth = date.getMonth() === month
            const isSelected = value === dateISO
            const today = getTodayInRestaurantTZ()
            const isToday = dateISO === today

            return (
              <button
                key={`${weekIdx}-${dayIdx}`}
                type="button"
                onClick={() => { if (!disabledDates.has(dateISO)) onChange(dateISO) }}
                disabled={isDisabled}
                className={cn(
                  "w-6 h-6 text-[10px] font-medium rounded-sm transition-colors border",
                  "disabled:cursor-not-allowed disabled:opacity-15 disabled:line-through disabled:pointer-events-none",
                  isCurrentMonth ? "" : "opacity-30",
                  isSelected && !isDisabled && (dark
                    ? "border-white bg-white text-zinc-950 font-semibold"
                    : "border-foreground bg-foreground text-background font-semibold"
                  ),
                  isToday && !isSelected && !isDisabled && (dark
                    ? "border-white/50 bg-white/20 text-white font-semibold"
                    : "border-foreground/40 bg-foreground/8 text-foreground font-semibold"
                  ),
                  !isSelected && !isToday && !isDisabled && (dark
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

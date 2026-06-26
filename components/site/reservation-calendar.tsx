"use client"

import { useState, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getOperatingWindowForDate, isDateBlocked } from "@/app/actions/availability"
import { getTodayInRestaurantTZ } from "@/lib/timezone"

interface ReservationCalendarProps {
  value: string
  onChange: (date: string) => void
  dark?: boolean
}

export function ReservationCalendar({ value, onChange, dark = false }: ReservationCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    // Initialize to the month of the selected value or today
    const date = value ? new Date(value + "T00:00:00") : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const [disabledDates, setDisabledDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Load disabled dates and blocked dates on mount and when view month changes
  useEffect(() => {
    const loadDisabledDates = async () => {
      setLoading(true)
      const disabled = new Set<string>()
      const today = getTodayInRestaurantTZ()
      const todayDate = new Date(today + "T00:00:00")

      // Generate all dates in the current view (6 weeks = 42 days)
      const startDate = new Date(viewMonth)
      startDate.setDate(1)
      startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        const dateISO = d.toISOString().split("T")[0]

        // Disable past dates
        if (d < todayDate) {
          disabled.add(dateISO)
          continue
        }

        // Get operating window for this day
        const opWindow = await getOperatingWindowForDate(dateISO)
        if (!opWindow || opWindow.is_closed) {
          disabled.add(dateISO)
          continue
        }

        // Check if explicitly blocked
        const blocked = await isDateBlocked(dateISO)
        if (blocked) {
          disabled.add(dateISO)
          continue
        }
      }

      setDisabledDates(disabled)
      setLoading(false)
    }

    loadDisabledDates()
  }, [viewMonth])

  const handlePrevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleDateClick = (date: string) => {
    if (!disabledDates.has(date)) {
      onChange(date)
    }
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
      "rounded-sm border p-3",
      dark
        ? "border-white/10 bg-white/8"
        : "border-border/40 bg-background",
    )}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
            dark
              ? "hover:bg-white/10 text-white/60 hover:text-white"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className={cn(
          "text-xs font-semibold tracking-wide flex-1 text-center",
          dark ? "text-white/70" : "text-foreground/70",
        )}>
          {monthName}
        </h3>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
            dark
              ? "hover:bg-white/10 text-white/60 hover:text-white"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className={cn(
              "text-center text-[10px] font-semibold tracking-wide py-1",
              dark ? "text-white/40" : "text-muted-foreground",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
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
                onClick={() => handleDateClick(dateISO)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square text-xs font-medium rounded-sm transition-colors border",
                  "disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through",
                  isCurrentMonth ? "" : "opacity-20",
                  isSelected && !isDisabled && (dark
                    ? "border-white/50 bg-white/15 text-white"
                    : "border-primary/60 bg-primary/10 text-primary"
                  ),
                  isToday && !isSelected && !isDisabled && (dark
                    ? "border-white/30 bg-white/8 text-white"
                    : "border-border bg-secondary/50 text-foreground"
                  ),
                  !isSelected && !isToday && !isDisabled && (dark
                    ? "border-white/10 hover:border-white/20 hover:bg-white/5 text-white/70 hover:text-white"
                    : "border-border hover:border-foreground/30 hover:bg-secondary text-foreground"
                  ),
                )}
              >
                {date.getDate()}
              </button>
            )
          })
        )}
      </div>

      {loading && (
        <div className={cn(
          "text-center text-xs mt-2",
          dark ? "text-white/40" : "text-muted-foreground",
        )}>
          Loading availability...
        </div>
      )}
    </div>
  )
}

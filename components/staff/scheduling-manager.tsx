"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  type OperatingWindow,
  upsertOperatingWindows,
  toggleBlockedDate,
} from "@/app/actions/availability"
import { ReservationCalendar } from "@/components/site/reservation-calendar"
import { Save } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// Mandatory baseline seed — Mon-Sat open 09:00-22:00, Sunday closed.
const SEED_WINDOWS: OperatingWindow[] = [
  { day_of_week: 0, opens_at: "09:00", closes_at: "22:00", is_closed: true },
  { day_of_week: 1, opens_at: "09:00", closes_at: "22:00", is_closed: false },
  { day_of_week: 2, opens_at: "09:00", closes_at: "22:00", is_closed: false },
  { day_of_week: 3, opens_at: "09:00", closes_at: "22:00", is_closed: false },
  { day_of_week: 4, opens_at: "09:00", closes_at: "22:00", is_closed: false },
  { day_of_week: 5, opens_at: "09:00", closes_at: "22:00", is_closed: false },
  { day_of_week: 6, opens_at: "09:00", closes_at: "22:00", is_closed: false },
]

function hydrateWindows(initial: OperatingWindow[]): OperatingWindow[] {
  // If the DB returned nothing, use the mandatory seed.
  if (!initial || initial.length === 0) return SEED_WINDOWS

  // Fill any missing days from the seed so we always have all 7.
  const byDay: Record<number, OperatingWindow> = {}
  for (const w of initial) byDay[w.day_of_week] = w
  return SEED_WINDOWS.map((seed) => byDay[seed.day_of_week] ?? seed)
}

export function SchedulingManager({
  initialOperatingWindows,
  initialBlockedDates = [],
}: {
  initialOperatingWindows: OperatingWindow[]
  initialBlockedDates?: string[]
}) {
  const [windows, setWindows] = useState<OperatingWindow[]>(() =>
    hydrateWindows(initialOperatingWindows),
  )
  const [blockedDates, setBlockedDates] = useState<string[]>(initialBlockedDates)
  const [savingHours, setSavingHours] = useState(false)
  const [togglingDate, setTogglingDate] = useState<string | null>(null)

  // Build the windows map for the calendar's disabled-date logic
  const windowsMap: Record<number, OperatingWindow> = {}
  for (const w of windows) windowsMap[w.day_of_week] = w

  const handleWindowChange = useCallback(
    (dayOfWeek: number, patch: Partial<Omit<OperatingWindow, "day_of_week">>) => {
      setWindows((prev) =>
        prev.map((w) => (w.day_of_week === dayOfWeek ? { ...w, ...patch } : w)),
      )
    },
    [],
  )

  const handleSaveHours = async () => {
    setSavingHours(true)
    try {
      const result = await upsertOperatingWindows(windows)
      if (result.success) {
        toast.success("Operating hours updated successfully.")
      } else {
        toast.error("Failed to save", { description: result.error })
      }
    } catch (err) {
      toast.error("Failed to save", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    } finally {
      setSavingHours(false)
    }
  }

  // Called by the calendar in adminMode — toggles the date in DB and local state.
  // Guard: skip if the day-of-week is marked is_closed in the live windows state
  // (the calendar already prevents the click visually, but this is a safety net).
  const handleCalendarDateClick = async (dateISO: string) => {
    const dow = new Date(dateISO + "T00:00:00").getDay()
    if (windowsMap[dow]?.is_closed) return

    // Snapshot current state before optimistic update for rollback
    const previousDates = blockedDates

    // Optimistically update UI immediately
    const isCurrentlyBlocked = blockedDates.includes(dateISO)
    setBlockedDates((prev) =>
      isCurrentlyBlocked ? prev.filter((d) => d !== dateISO) : [...prev, dateISO],
    )

    setTogglingDate(dateISO)
    try {
      const result = await toggleBlockedDate(dateISO)
      setTogglingDate(null)

      if (result.error) {
        // Rollback optimistic update on error
        setBlockedDates(previousDates)
        toast.error("Failed to update blocked date", {
          description: result.error ?? "Database rejected the date block.",
        })
        return
      }

      // Reconcile with server truth in case our optimistic guess was wrong
      setBlockedDates((prev) =>
        result.blocked
          ? prev.includes(dateISO) ? prev : [...prev, dateISO]
          : prev.filter((d) => d !== dateISO),
      )
    } catch (err) {
      // Rollback on unexpected network / server error
      setTogglingDate(null)
      setBlockedDates(previousDates)
      toast.error("Failed to update blocked date", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      {/* ── Left column: Operating Hours ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide">Standard Operating Hours</CardTitle>
          <CardDescription className="text-xs">
            Set opening and closing times for each day of the week. Changes are batched — click
            &ldquo;Save Changes&rdquo; to persist.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="divide-y divide-border/40">
            {windows.map((w) => (
              <div
                key={w.day_of_week}
                className="flex items-center justify-between gap-4 py-3 last:pb-0 first:pt-0"
              >
                {/* Day name + open/close toggle */}
                <div className="flex w-28 shrink-0 items-center gap-3">
                  <Switch
                    checked={!w.is_closed}
                    onCheckedChange={(checked) =>
                      handleWindowChange(w.day_of_week, { is_closed: !checked })
                    }
                    size="sm"
                  />
                  <Label
                    className={cn(
                      "text-xs font-medium",
                      w.is_closed ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {DAYS[w.day_of_week]}
                  </Label>
                </div>

                {/* Time inputs — hidden when closed */}
                {w.is_closed ? (
                  <span className="text-xs text-muted-foreground">Closed</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={w.opens_at}
                      onChange={(e) =>
                        handleWindowChange(w.day_of_week, { opens_at: e.target.value })
                      }
                      className={cn(
                        "h-7 w-24 rounded-sm border border-border/60 bg-transparent px-2 text-xs",
                        "focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20",
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={w.closes_at}
                      onChange={(e) =>
                        handleWindowChange(w.day_of_week, { closes_at: e.target.value })
                      }
                      className={cn(
                        "h-7 w-24 rounded-sm border border-border/60 bg-transparent px-2 text-xs",
                        "focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20",
                      )}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveHours}
            disabled={savingHours}
            size="sm"
            className="mt-5 w-full gap-1.5"
          >
            <Save className="size-3.5" />
            {savingHours ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Right column: Blocked Dates calendar ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide">Blocked Dates</CardTitle>
          <CardDescription className="text-xs">
            Click a date to toggle it as blocked. Blocked dates are highlighted in red and
            instantly persisted — no save step required.
            {togglingDate && (
              <span className="ml-1 text-muted-foreground">Updating…</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReservationCalendar
            value=""
            onChange={handleCalendarDateClick}
            operatingWindows={windowsMap}
            blockedDates={blockedDates}
            adminMode={true}
          />

          {/* Blocked dates list */}
          {blockedDates.length > 0 && (
            <div className="mt-4 space-y-1 border-t border-border/40 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {blockedDates.length} blocked {blockedDates.length === 1 ? "date" : "dates"}
              </p>
              {[...blockedDates].sort().map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between rounded-sm border border-destructive/20 bg-destructive/5 px-2 py-1"
                >
                  <span className="text-xs text-destructive">
                    {new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCalendarDateClick(d)}
                    className="text-[10px] text-destructive/60 hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

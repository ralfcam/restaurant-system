"use client"

import { useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateRestaurantContactInfo } from "@/app/actions/restaurant-info"
import {
  type OperatingDay,
  upsertOperatingWindows,
  toggleBlockedDate,
} from "@/app/actions/availability"
import { ReservationCalendar } from "@/components/site/reservation-calendar"
import {
  DAY_NAMES,
  daysToWindowsMap,
  groupRowsByDay,
  nextSuggestedSegment,
  summarizeOperatingDays,
  validateOperatingDays,
  type OperatingSegment,
  type OperatingWindowRow,
} from "@/lib/reservations/operating-hours"
import { Copy, Plus, Save, Trash2 } from "lucide-react"

function isSchemaCacheError(error: string): boolean {
  const e = error.toLowerCase()
  return (
    e.includes("pgrst116") ||
    e.includes("pgrst205") ||
    e.includes("schema cache") ||
    e.includes("does not exist")
  )
}

type SegmentDraft = OperatingSegment & { key: string }
type DayDraft = { day_of_week: number; is_closed: boolean; segments: SegmentDraft[] }

let segmentKeySeq = 0
function nextSegmentKey(): string {
  segmentKeySeq += 1
  return `seg-${segmentKeySeq}`
}

function toDraftDays(initial: OperatingDay[]): DayDraft[] {
  const grouped =
    initial.length === 7 && initial.every((day) => Array.isArray(day.segments))
      ? initial
      : groupRowsByDay(initial as unknown as OperatingWindowRow[])

  return grouped.map((day) => ({
    day_of_week: day.day_of_week,
    is_closed: day.is_closed,
    segments: day.segments.map((segment) => ({ ...segment, key: nextSegmentKey() })),
  }))
}

function toOperatingDays(drafts: DayDraft[]): OperatingDay[] {
  return drafts.map((day) => ({
    day_of_week: day.day_of_week,
    is_closed: day.is_closed,
    segments: day.segments.map((segment, index) => {
      const note = segment.guest_note?.trim()
      return {
        opens_at: segment.opens_at,
        closes_at: segment.closes_at,
        label: segment.label,
        sort_order: index,
        ...(note ? { guest_note: note } : {}),
      }
    }),
  }))
}

const TIME_INPUT_CLS = cn(
  "h-7 w-[6.5rem] rounded-sm border border-border/60 bg-transparent px-2 text-xs",
  "focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20",
)

const LABEL_INPUT_CLS = cn(
  "h-7 w-24 rounded-sm border border-border/60 bg-transparent px-2 text-xs",
  "placeholder:text-muted-foreground/70",
  "focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20",
)

const NOTE_INPUT_CLS = cn(
  "h-7 min-w-[10rem] flex-1 rounded-sm border border-border/60 bg-transparent px-2 text-xs",
  "placeholder:text-muted-foreground/70",
  "focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/20",
)

export function SchedulingManager({
  initialOperatingWindows,
  initialBlockedDates = [],
  initialAddress,
  initialPhone,
}: {
  initialOperatingWindows: OperatingDay[]
  initialBlockedDates?: string[]
  initialAddress: string
  initialPhone: string
}) {
  const [days, setDays] = useState<DayDraft[]>(() => toDraftDays(initialOperatingWindows))
  const [blockedDates, setBlockedDates] = useState<string[]>(initialBlockedDates)
  const [address, setAddress] = useState(initialAddress)
  const [phone, setPhone] = useState(initialPhone)
  const [savingContact, setSavingContact] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [togglingDate, setTogglingDate] = useState<string | null>(null)

  const operatingDays = useMemo(() => toOperatingDays(days), [days])
  const windowsMap = useMemo(() => daysToWindowsMap(operatingDays), [operatingDays])
  const hoursSummary = useMemo(() => summarizeOperatingDays(operatingDays), [operatingDays])
  const hoursError = useMemo(() => validateOperatingDays(operatingDays), [operatingDays])

  const patchDay = useCallback((dayOfWeek: number, patch: (day: DayDraft) => DayDraft) => {
    setDays((prev) => prev.map((day) => (day.day_of_week === dayOfWeek ? patch(day) : day)))
  }, [])

  const handleToggleOpen = (dayOfWeek: number, open: boolean) => {
    patchDay(dayOfWeek, (day) => {
      if (!open) return { ...day, is_closed: true }
      return {
        ...day,
        is_closed: false,
        segments:
          day.segments.length > 0
            ? day.segments
            : [{ ...nextSuggestedSegment([]), key: nextSegmentKey() }],
      }
    })
  }

  const handleSegmentChange = (
    dayOfWeek: number,
    key: string,
    patch: Partial<Pick<OperatingSegment, "label" | "opens_at" | "closes_at" | "guest_note">>,
  ) => {
    patchDay(dayOfWeek, (day) => ({
      ...day,
      segments: day.segments.map((segment) =>
        segment.key === key ? { ...segment, ...patch } : segment,
      ),
    }))
  }

  const handleAddSegment = (dayOfWeek: number) => {
    patchDay(dayOfWeek, (day) => ({
      ...day,
      is_closed: false,
      segments: [
        ...day.segments,
        { ...nextSuggestedSegment(day.segments), key: nextSegmentKey() },
      ],
    }))
  }

  const handleRemoveSegment = (dayOfWeek: number, key: string) => {
    patchDay(dayOfWeek, (day) => {
      const segments = day.segments.filter((segment) => segment.key !== key)
      return {
        ...day,
        is_closed: segments.length === 0 ? true : day.is_closed,
        segments,
      }
    })
  }

  const handleCopyToWeekdays = (sourceDay: number) => {
    const source = days.find((day) => day.day_of_week === sourceDay)
    if (!source) return
    setDays((prev) =>
      prev.map((day) => {
        if (day.day_of_week === 0 || day.day_of_week === sourceDay) return day
        return {
          ...day,
          is_closed: source.is_closed,
          segments: source.segments.map((segment) => ({
            ...segment,
            key: nextSegmentKey(),
          })),
        }
      }),
    )
    toast.success(`Copied ${DAY_NAMES[sourceDay]} hours to Mon–Sat.`)
  }

  const handleSaveContact = async () => {
    setSavingContact(true)
    try {
      const result = await updateRestaurantContactInfo({ address, phone })
      if (result.error) {
        toast.error("Could not save contact information", { description: result.error })
        return
      }
      toast.success("Homepage contact information updated.")
    } catch (err) {
      toast.error("Could not save contact information", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    } finally {
      setSavingContact(false)
    }
  }

  const handleSaveHours = async () => {
    if (hoursError) {
      toast.error("Cannot save opening hours", { description: hoursError })
      return
    }

    setSavingHours(true)
    try {
      const result = await upsertOperatingWindows(operatingDays)
      if (result.success) {
        toast.success("Opening hours updated successfully.")
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

  const handleCalendarDateClick = async (dateISO: string) => {
    const dow = new Date(dateISO + "T00:00:00").getDay()
    if (windowsMap[dow]?.is_closed) return

    const previousDates = blockedDates
    const isCurrentlyBlocked = blockedDates.includes(dateISO)
    setBlockedDates((prev) =>
      isCurrentlyBlocked ? prev.filter((d) => d !== dateISO) : [...prev, dateISO],
    )

    setTogglingDate(dateISO)
    try {
      const result = await toggleBlockedDate(dateISO)
      setTogglingDate(null)

      if (result.error) {
        setBlockedDates(previousDates)
        if (isSchemaCacheError(result.error)) {
          toast.error("Database not configured", {
            description:
              "Missing database table. Please run the SQL migration for 'blocked_dates' in your Supabase dashboard.",
          })
        } else {
          toast.error("Failed to update blocked date", {
            description: result.error ?? "Database rejected the date block.",
          })
        }
        return
      }

      setBlockedDates((prev) =>
        result.blocked
          ? prev.includes(dateISO) ? prev : [...prev, dateISO]
          : prev.filter((d) => d !== dateISO),
      )
    } catch (err) {
      setTogglingDate(null)
      setBlockedDates(previousDates)
      toast.error("Failed to update blocked date", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide">Homepage info bar</CardTitle>
          <CardDescription className="text-xs">
            Control the address and reservation number shown beneath the homepage hero. Hours are generated automatically from the opening-hour segments below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Hours preview
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
              {hoursSummary}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-generated from opening hours below. Save those hours to publish changes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="restaurant-address">Address</Label>
              <Input
                id="restaurant-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={240}
                placeholder="Restaurant address"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="restaurant-phone">Reservation phone</Label>
              <Input
                id="restaurant-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={40}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveContact}
            disabled={savingContact || !address.trim() || !phone.trim()}
            className="w-full sm:w-fit"
          >
            <Save className="size-3.5" />
            {savingContact ? "Saving…" : "Save contact info"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide">Opening hours</CardTitle>
          <CardDescription className="text-xs">
            Set one or more service segments per day — for example morning 09:00–11:00,
            lunch 12:00–14:00, dinner 18:00–22:00. Guests can only book inside these
            windows. Changes are batched — click &ldquo;Save Changes&rdquo; to persist.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="divide-y divide-border/40">
            {days.map((day) => (
              <div key={day.day_of_week} className="py-3 first:pt-0 last:pb-0" data-day={day.day_of_week}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex w-28 shrink-0 items-center gap-3">
                    <Switch
                      checked={!day.is_closed}
                      onCheckedChange={(checked) => handleToggleOpen(day.day_of_week, checked)}
                      size="sm"
                      aria-label={`${DAY_NAMES[day.day_of_week]} open`}
                    />
                    <Label
                      className={cn(
                        "text-xs font-medium",
                        day.is_closed ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {DAY_NAMES[day.day_of_week]}
                    </Label>
                  </div>
                  {day.is_closed ? (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCopyToWeekdays(day.day_of_week)}
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Copy className="size-3" />
                      Copy to weekdays
                    </button>
                  )}
                </div>

                {!day.is_closed && (
                  <div className="mt-2 space-y-1.5 pl-10">
                    {day.segments.map((segment, index) => (
                      <div
                        key={segment.key}
                        data-testid="scheduling-segment-row"
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        <span className="w-3 shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={segment.label ?? ""}
                          placeholder={["Morning", "Lunch", "Dinner"][index] ?? "Segment"}
                          onChange={(e) =>
                            handleSegmentChange(day.day_of_week, segment.key, {
                              label: e.target.value || null,
                            })
                          }
                          aria-label={`${DAY_NAMES[day.day_of_week]} segment ${index + 1} label`}
                          className={LABEL_INPUT_CLS}
                        />
                        <input
                          type="time"
                          value={segment.opens_at}
                          onChange={(e) =>
                            handleSegmentChange(day.day_of_week, segment.key, {
                              opens_at: e.target.value,
                            })
                          }
                          aria-label={`${DAY_NAMES[day.day_of_week]} segment ${index + 1} opens`}
                          className={TIME_INPUT_CLS}
                        />
                        <span className="text-[10px] text-muted-foreground">–</span>
                        <input
                          type="time"
                          value={segment.closes_at}
                          onChange={(e) =>
                            handleSegmentChange(day.day_of_week, segment.key, {
                              closes_at: e.target.value,
                            })
                          }
                          aria-label={`${DAY_NAMES[day.day_of_week]} segment ${index + 1} closes`}
                          className={TIME_INPUT_CLS}
                        />
                        <input
                          type="text"
                          value={segment.guest_note ?? ""}
                          placeholder="Guest note"
                          onChange={(e) =>
                            handleSegmentChange(day.day_of_week, segment.key, {
                              guest_note: e.target.value || null,
                            })
                          }
                          aria-label={`${DAY_NAMES[day.day_of_week]} segment ${index + 1} guest note`}
                          className={NOTE_INPUT_CLS}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSegment(day.day_of_week, segment.key)}
                          className="ml-0.5 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${DAY_NAMES[day.day_of_week]} segment ${index + 1}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddSegment(day.day_of_week)}
                      className="h-7 px-2 text-xs text-muted-foreground"
                      data-testid="add-segment"
                    >
                      <Plus className="size-3.5" />
                      Add segment
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hoursError && (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {hoursError}
            </p>
          )}

          <Button
            onClick={handleSaveHours}
            disabled={savingHours || Boolean(hoursError)}
            size="sm"
            className="mt-5 w-full gap-1.5"
          >
            <Save className="size-3.5" />
            {savingHours ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

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
                    className="text-[10px] text-destructive/60 transition-colors hover:text-destructive"
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
    </div>
  )
}

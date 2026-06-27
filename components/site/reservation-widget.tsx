"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarDays, Users, Clock, Check, Loader2, ArrowLeft, CalendarCheck } from "lucide-react"
import { toast } from "sonner"
import { TABLES, RESTAURANT } from "@/lib/data"

import { createReservation, getAvailableSlots, type SlotAvailability } from "@/app/actions/reservations"
import { getAllOperatingWindowsMap, getBlockedDatesInRange, type OperatingWindow } from "@/app/actions/availability"
import { getTodayInRestaurantTZ, getNowTimeInRestaurantTZ } from "@/lib/timezone"
import { ReservationCalendar } from "@/components/site/reservation-calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const ONLINE_MAX_PARTY = 8
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => n <= ONLINE_MAX_PARTY)
const MAX_CAPACITY = Math.max(...TABLES.map((t) => t.seats))

/** Get the minimum bookable date (today or tomorrow, in restaurant timezone). */
function getMinBookableDate(): string {
  const today = getTodayInRestaurantTZ()
  const nowTime = getNowTimeInRestaurantTZ()
  const lastSlotHour = 21

  // If it's past 21:00 in restaurant timezone, start bookings tomorrow.
  // Build YYYY-MM-DD from local date components to avoid UTC timezone shift.
  if (nowTime >= `${lastSlotHour}:00`) {
    const tomorrow = new Date(today + "T00:00:00")
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0")
    const dd = String(tomorrow.getDate()).padStart(2, "0")
    return `${yy}-${mm}-${dd}`
  }

  return today
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

// ─── Animated step wrapper ──────────────────────────────────────────────────
// Renders as absolute fill so steps overlap during transitions, preventing
// any vertical layout shift. overflow-y-auto is opt-in per step.
function StepPanel({
  children,
  stepKey,
  scroll = false,
}: {
  children: React.ReactNode
  stepKey: string | number
  scroll?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = "0"
    el.style.transform = "translateY(10px)"
    requestAnimationFrame(() => {
      el.style.transition = "opacity 240ms ease, transform 240ms ease"
      el.style.opacity = "1"
      el.style.transform = "translateY(0)"
    })
  }, [stepKey])
  return (
    <div
      ref={ref}
      className={cn("absolute inset-0", scroll ? "overflow-y-auto" : "overflow-hidden")}
    >
      {children}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────
export function ReservationWidget({ dark = false }: { dark?: boolean }) {
  const [party, setParty] = useState("2")
  // Date is intentionally empty on first render (server + first client paint)
  // to avoid a hydration mismatch — `firstAvailableDate()` depends on the
  // local clock/timezone, which differs between server (UTC) and browser.
  // It's populated in a mount effect below.
  const [mounted, setMounted] = useState(false)
  const [date, setDate] = useState("")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1=select, 2=details, 3=done
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confCode, setConfCode] = useState("")
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [operatingWindows, setOperatingWindows] = useState<Record<number, OperatingWindow> | null>(null)
  const [blockedDates, setBlockedDates] = useState<string[]>([])

  // Cache for slot availability to avoid redundant server requests
  const slotCacheRef = useRef<Record<string, SlotAvailability[]>>({})
  // Debounce timer for fetch requests
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const partyNum = Number(party)
  const overCapacity = partyNum > MAX_CAPACITY
  const displaySlots = overCapacity ? [] : slots
  const availableSlots = displaySlots.filter((s) => s.available)
  const displayLoadingSlots = overCapacity ? false : loadingSlots

  const fetchSlots = useCallback(async (d: string, p: number) => {
    const cacheKey = `${d}-${p}`
    
    // Check cache first — if available, use it immediately without loading state
    if (slotCacheRef.current[cacheKey]) {
      setSlots(slotCacheRef.current[cacheKey])
      setLoadingSlots(false)
      return
    }
    
    // Show loading state and fetch from server
    setLoadingSlots(true)
    const result = await getAvailableSlots(d, p)
    
    // Store in cache for future requests
    slotCacheRef.current[cacheKey] = result
    
    // Always set slots, regardless of availability. This ensures the UI
    // can render the "No availability for this date" message without
    // triggering an infinite loop by trying to auto-advance the date.
    setSlots(result)
    setLoadingSlots(false)
  }, [])

  // Populate the real date and fetch global scheduling rules on mount.
  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true)
      setDate(getMinBookableDate())
    })

    // Fetch operating windows and blocked dates in parallel on mount so the
    // calendar has accurate disabled-date data from its very first open.
    const today = getTodayInRestaurantTZ()
    const end = new Date(today + "T00:00:00")
    end.setMonth(end.getMonth() + 3)
    const yy = end.getFullYear()
    const mm = String(end.getMonth() + 1).padStart(2, "0")
    const dd = String(end.getDate()).padStart(2, "0")
    const endISO = `${yy}-${mm}-${dd}`

    Promise.all([
      getAllOperatingWindowsMap(),
      getBlockedDatesInRange(today, endISO),
    ]).then(([windows, blocked]) => {
      setOperatingWindows(windows)
      setBlockedDates(blocked)
    })
  }, [])

  // When the calendar dialog opens, refresh blocked dates to pick up any
  // admin changes made since the component mounted.
  useEffect(() => {
    if (!isCalendarOpen) return
    const today = getTodayInRestaurantTZ()
    const end = new Date(today + "T00:00:00")
    end.setMonth(end.getMonth() + 3)
    const yy = end.getFullYear()
    const mm = String(end.getMonth() + 1).padStart(2, "0")
    const dd = String(end.getDate()).padStart(2, "0")
    const endISO = `${yy}-${mm}-${dd}`
    getBlockedDatesInRange(today, endISO).then(setBlockedDates)
  }, [isCalendarOpen])

  // Debounced slot fetching to prevent slamming the server with rapid requests
  useEffect(() => {
    if (!date || overCapacity) return
    
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Set a new debounce timer (300ms delay before fetching)
    debounceTimerRef.current = setTimeout(() => {
      fetchSlots(date, partyNum)
    }, 300)
    
    // Cleanup: clear timer on unmount or if dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [date, partyNum, overCapacity, fetchSlots])

  function pickSlot(time: string) {
    setSlot(time)
    setStep(2)
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { confCode: code, error } = await createReservation({
      guestName: name,
      partySize: partyNum,
      date,
      time: slot!,
      phone,
    })
    setSubmitting(false)
    if (error) {
      // Detect database-level trigger rejections by their prefix and show a
      // dedicated toast. Form inputs (name, phone, email) are intentionally
      // NOT reset so the guest can pick a new slot without re-typing.
      const isSlotError =
        error.toLowerCase().includes("blocked") ||
        error.toLowerCase().includes("operating hours") ||
        error.toLowerCase().includes("closed")
      if (isSlotError) {
        setSlot(null)
        setStep(1)
        toast.error("Time slot unavailable", {
          description: "This slot was just booked or is outside operating hours.",
        })
      } else {
        toast.error("Could not confirm reservation", { description: error })
      }
      return
    }
    setConfCode(code)
    setStep(3)
    toast.success("Reservation confirmed", {
      description: `${name}, party of ${party} · ${formatDate(date)} at ${slot}`,
    })
  }

  function reset() {
    setStep(1); setSlot(null); setName(""); setEmail(""); setPhone(""); setConfCode("")
  }

  // ── Shared style helpers ──
  const lbl = dark ? "text-white/55" : "text-muted-foreground"
  const inp = dark
    ? "bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/20"
    : ""
  const triggerCls = dark
    ? "bg-transparent hover:bg-white/10 border-white/15 text-white [&_svg]:text-white/60 focus-visible:ring-white/20"
    : ""

  return (
    <div className={cn(
      "relative h-[380px] overflow-hidden pb-4",
      dark ? "bg-transparent" : "bg-card",
    )}>

      {/* ── STEP 3: Confirmation ────────────────────────────────── */}
      {step === 3 && (
        <StepPanel stepKey="done" scroll>
          <div className="p-5 md:p-6">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="relative flex size-14 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/30 [animation-iteration-count:3]" />
              <span className={cn(
                "relative flex size-14 items-center justify-center rounded-full",
                dark ? "bg-white/15 text-white" : "bg-accent text-accent-foreground",
              )}>
                <Check className="size-7" strokeWidth={2.5} />
              </span>
            </span>

            <h3 className={cn("font-heading text-xl font-semibold", dark ? "text-white" : "")}>
              Table reserved
            </h3>
            <p className={cn("max-w-xs text-pretty text-xs", dark ? "text-white/55" : "text-muted-foreground")}>
              We&apos;re looking forward to hosting you, {name || "you"}.
            </p>

            <dl className={cn(
              "mt-1 w-full divide-y rounded-xl border text-left text-sm",
              dark
                ? "divide-white/10 border-white/10 bg-white/5"
                : "divide-border border-border bg-secondary/40",
            )}>
              {[
                { label: "Guest", value: name || "Guest" },
                { label: "When", value: `${formatDate(date)} · ${slot}` },
                { label: "Party", value: `${party} ${partyNum === 1 ? "guest" : "guests"}` },
                {
                  label: "Confirmation",
                  value: (
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tracking-widest",
                      dark ? "bg-white/10 text-white" : "bg-primary/10 text-primary",
                    )}>
                      {confCode}
                    </span>
                  ),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <dt className={dark ? "text-white/45 text-xs" : "text-muted-foreground text-xs"}>{label}</dt>
                  <dd className={cn("font-medium text-sm", dark ? "text-white" : "")}>{value}</dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              onClick={reset}
              className={cn(
                "mt-2 text-xs underline-offset-2 hover:underline",
                dark ? "text-white/45 hover:text-white/70" : "text-muted-foreground",
              )}
            >
              Make another reservation
            </button>
          </div>
          </div>
        </StepPanel>
      )}

      {/* ── STEP 1: Party / Date / Time slots ──────────────────── */}
      {step === 1 && (
        <StepPanel stepKey="step1">
          <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 gap-3">
            {/* Party size */}
            <div className="space-y-1.5">
              <Label className={cn("flex items-center gap-1.5 text-xs font-medium", lbl)}>
                <Users className="size-3.5" /> Party size
              </Label>
              <Select
                value={String(Math.min(Number(party), ONLINE_MAX_PARTY))}
                onValueChange={(v) => {
                  const clamped = Math.min(Number(v ?? "1"), ONLINE_MAX_PARTY)
                  setParty(String(clamped))
                  setSlot(null)
                }}
              >
                <SelectTrigger className={cn("w-full", triggerCls)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn(dark ? "border-white/10 bg-black/80 text-white shadow-2xl shadow-black/60 backdrop-blur-xl" : "")}>
                  {PARTY_SIZES.map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      className={cn(dark ? "text-white/90 focus:bg-white/15 focus:text-white data-[state=checked]:text-white [&_svg]:text-white/60" : "")}
                    >
                      {n} {n === 1 ? "guest" : "guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Large-group notice */}
              <p className={cn("border-t pt-3 mt-1 text-sm leading-relaxed tracking-wide", dark ? "border-white/10 text-white/50" : "border-border/40 text-muted-foreground")}>
                For groups of more than {ONLINE_MAX_PARTY}, please call us directly at{" "}
                <a
                  href={`tel:${RESTAURANT.phone}`}
                  className={cn("underline underline-offset-2 transition-colors", dark ? "text-white/70 hover:text-white" : "text-foreground hover:text-primary")}
                >
                  {RESTAURANT.phone}
                </a>
                .
              </p>
            </div>

            {/* Date picker trigger */}
            <div className="space-y-1.5">
              <Label className={cn("flex items-center gap-1.5 text-xs font-medium", lbl)}>
                <CalendarDays className="size-3.5" /> Date
              </Label>
              {mounted && (
                <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <DialogTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          "w-full h-9 rounded-lg border px-3 flex items-center justify-between text-sm transition-colors",
                          dark
                            ? "border-white/15 bg-white/10 text-white hover:bg-white/15 focus:ring-2 focus:ring-white/20 focus:border-white/30"
                            : "border-input bg-transparent hover:bg-secondary focus:ring-2 focus:ring-ring/20 focus:border-foreground/30",
                        )}
                      />
                    }
                  >
                    <span>{date ? formatDate(date) : "Select a date"}</span>
                    <CalendarDays className="size-3.5 opacity-60" />
                  </DialogTrigger>
                  <DialogContent showCloseButton={true} className={cn(
                    "max-w-sm rounded-sm border border-border/40 bg-background p-6 shadow-none",
                    dark ? "border-white/10 bg-zinc-950" : "bg-white border-border/60",
                  )}>
                    <DialogHeader>
                      <DialogTitle className={cn("text-sm font-semibold tracking-wide", dark ? "text-white" : "text-foreground")}>
                        Select a date
                      </DialogTitle>
                    </DialogHeader>
                    <ReservationCalendar
                      value={date}
                      onChange={(newDate) => {
                        setDate(newDate)
                        setSlot(null)
                        setIsCalendarOpen(false)
                      }}
                      dark={dark}
                      operatingWindows={operatingWindows}
                      blockedDates={blockedDates}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Available times */}
          {overCapacity ? (
            <p className={cn("mt-4 rounded-xl px-3 py-2.5 text-sm", dark ? "bg-white/10 text-white/60" : "bg-secondary text-muted-foreground")}>
              For parties larger than {MAX_CAPACITY}, please call us to arrange seating.
            </p>
          ) : (
            <div className="mt-4">
              <Label className={cn("flex items-center gap-1.5 text-xs font-medium", lbl)}>
                <Clock className="size-3.5" /> Available times
              </Label>
              {displayLoadingSlots ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-9 w-16 rounded-full border animate-pulse",
                        dark
                          ? "border-white/10 bg-white/5"
                          : "border-border/20 bg-muted/50"
                      )}
                      style={{
                        animationDelay: `${i * 40}ms`,
                        animationDuration: "1.5s",
                      }}
                    />
                  ))}
                </div>
              ) : availableSlots.length === 0 ? (
                <p className={cn("mt-2 text-sm tracking-wide", dark ? "text-white/50" : "text-muted-foreground")}>
                  No availability for this date. Try another day.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2 max-h-[320px] overflow-y-auto overscroll-contain pr-3" style={{ scrollbarWidth: 'thin' }}>
                  {availableSlots.map(({ time }) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => pickSlot(time)}
                      className={cn(
                        "w-16 rounded-full border py-2 text-center text-xs font-medium tracking-wide transition-all duration-150 active:scale-95",
                        dark
                          ? "border-white/20 bg-white/8 text-white/80 hover:border-white/50 hover:bg-white/15 hover:text-white"
                          : "border-border bg-background hover:border-primary/60 hover:text-primary",
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </StepPanel>
      )}

      {/* ── STEP 2: Guest details ───────────────────────────────── */}
      {step === 2 && slot && (
        <StepPanel stepKey="step2" scroll>
          <div className="p-5 md:p-6">
          {/* Booking summary */}
          <div className={cn(
            "mb-5 flex items-start gap-3 rounded-xl border p-3.5",
            dark ? "border-white/10 bg-white/6" : "border-border bg-secondary/50",
          )}>
            <span className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              dark ? "bg-white/10 text-white" : "bg-primary/10 text-primary",
            )}>
              <CalendarCheck className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", dark ? "text-white" : "")}>
                {partyNum} {partyNum === 1 ? "guest" : "guests"} &middot; {formatDate(date)} at <span className={dark ? "text-[#C45A3B]" : "text-primary"}>{slot}</span>
              </p>
              <p className={cn("mt-0.5 text-xs", dark ? "text-white/45" : "text-muted-foreground")}>
                Real-time availability confirmed
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setStep(1); setSlot(null) }}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                dark
                  ? "border border-white/15 text-white/55 hover:bg-white/10 hover:text-white"
                  : "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <ArrowLeft className="size-3" /> Back
            </button>
          </div>

          {/* Details form */}
          <form onSubmit={confirm} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="res-name" className={cn("text-xs", dark ? "text-white/70" : "")}>Full name</Label>
                <Input id="res-name" required value={name} className={inp} onChange={(e) => setName(e.target.value)} placeholder="Jamie Rivera" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="res-phone" className={cn("text-xs", dark ? "text-white/70" : "")}>Phone</Label>
                <Input id="res-phone" required type="tel" value={phone} className={inp} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (503) 555-0100" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-email" className={cn("text-xs", dark ? "text-white/70" : "")}>Email <span className={dark ? "text-white/30" : "text-muted-foreground/60"}>(optional)</span></Label>
              <Input id="res-email" type="email" value={email} className={inp} onChange={(e) => setEmail(e.target.value)} placeholder="jamie@email.com" />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className={cn(
                "mt-1 w-full rounded-full font-semibold tracking-wide",
                dark ? "bg-[#C45A3B] text-white hover:bg-[#b04f33] shadow-lg shadow-black/30" : "",
              )}
            >
              {submitting
                ? <><Loader2 className="size-4 animate-spin" /> Confirming…</>
                : <>Confirm reservation</>
              }
            </Button>
          </form>
          </div>
        </StepPanel>
      )}

    </div>
  )
}

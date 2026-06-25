"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarDays, Users, Clock, Check, Loader2, ArrowLeft, CalendarCheck } from "lucide-react"
import { toast } from "sonner"
import { TABLES } from "@/lib/data"

import { createReservation, getAvailableSlots, type SlotAvailability } from "@/app/actions/reservations"
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

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]
const MAX_CAPACITY = Math.max(...TABLES.map((t) => t.seats))

/** Convert a Date to YYYY-MM-DD string in local timezone (not UTC). */
function getLocalISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

function todayISO() {
  return getLocalISO(new Date())
}

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return getLocalISO(d)
}

function firstAvailableDate() {
  const now = new Date()
  const lastSlotHour = 21
  return now.getHours() >= lastSlotHour ? tomorrowISO() : todayISO()
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
  const [date, setDate] = useState(firstAvailableDate)
  const [slot, setSlot] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1=select, 2=details, 3=done
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confCode, setConfCode] = useState("")
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)

  const partyNum = Number(party)
  const overCapacity = partyNum > MAX_CAPACITY

  const fetchSlots = useCallback(async (d: string, p: number) => {
    setLoadingSlots(true)
    const result = await getAvailableSlots(d, p)
    if (result.every((s) => !s.available)) {
      const next = new Date(d + "T00:00:00")
      next.setDate(next.getDate() + 1)
      setDate(next.toISOString().slice(0, 10))
      setLoadingSlots(false)
      return
    }
    setSlots(result)
    setLoadingSlots(false)
  }, [])

  useEffect(() => {
    if (overCapacity) { setSlots([]); setLoadingSlots(false); return }
    fetchSlots(date, partyNum)
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
    if (error) { toast.error("Could not confirm reservation", { description: error }); return }
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
      "relative h-[380px] overflow-hidden",
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Party size */}
            <div className="space-y-1.5">
              <Label className={cn("flex items-center gap-1.5 text-xs font-medium", lbl)}>
                <Users className="size-3.5" /> Party size
              </Label>
              <Select value={party} onValueChange={(v) => { setParty(v ?? ""); setSlot(null) }}>
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
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="res-date" className={cn("flex items-center gap-1.5 text-xs font-medium", lbl)}>
                <CalendarDays className="size-3.5" /> Date
              </Label>
              <input
                id="res-date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => { if (e.target.value) { setDate(e.target.value); setSlot(null) } }}
                style={{ colorScheme: dark ? "dark" : "light", accentColor: dark ? "#C45A3B" : undefined }}
                className={cn(
                  "flex h-9 w-full rounded-lg border px-3 py-1 text-sm outline-none transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  dark
                    ? "border-white/15 bg-white/10 text-white [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    : "border-input bg-transparent focus:ring-2 focus:ring-ring/20",
                )}
              />
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
              {loadingSlots ? (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={cn("h-9 animate-pulse rounded-full", dark ? "bg-white/10" : "bg-muted")} />
                  ))}
                </div>
              ) : slots.every((s) => !s.available) ? (
                <p className={cn("mt-2 rounded-xl px-3 py-2.5 text-sm", dark ? "bg-white/10 text-white/50" : "bg-secondary text-muted-foreground")}>
                  No availability for this date. Try another day.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {slots.map(({ time, available }) => (
                    <button
                      key={time}
                      type="button"
                      disabled={!available}
                      onClick={() => pickSlot(time)}
                      className={cn(
                        "rounded-full border py-2 text-xs font-medium tracking-wide transition-all duration-150",
                        dark && !available  && "cursor-not-allowed border-white/8 bg-white/4 text-white/20 line-through",
                        dark && available   && "border-white/20 bg-white/8 text-white/80 hover:border-white/50 hover:bg-white/15 hover:text-white active:scale-95",
                        !dark && !available && "cursor-not-allowed border-border bg-muted text-muted-foreground/40 line-through",
                        !dark && available  && "border-border bg-background hover:border-primary/60 hover:text-primary active:scale-95",
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

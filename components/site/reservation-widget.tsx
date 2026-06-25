"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, Users, Clock, Check, Loader2 } from "lucide-react"
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

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Returns today if there are still future slots today, otherwise tomorrow. */
function firstAvailableDate() {
  const now = new Date()
  const lastSlotHour = 21 // last slot is 21:30
  return now.getHours() >= lastSlotHour ? tomorrowISO() : todayISO()
}

export function ReservationWidget({ dark = false }: { dark?: boolean }) {
  const [party, setParty] = useState("2")
  const [date, setDate] = useState(firstAvailableDate)
  const [slot, setSlot] = useState<string | null>(null)
  const [step, setStep] = useState<"slots" | "details" | "done">("slots")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confCode, setConfCode] = useState("")
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)

  const partyNum = Number(party)
  const overCapacity = partyNum > MAX_CAPACITY

  const fetchSlots = useCallback(
    async (d: string, p: number) => {
      setLoadingSlots(true)
      const result = await getAvailableSlots(d, p)
      // If every slot is unavailable on this date, silently advance one day.
      if (result.every((s) => !s.available)) {
        const next = new Date(d + "T00:00:00")
        next.setDate(next.getDate() + 1)
        const nextISO = next.toISOString().slice(0, 10)
        setDate(nextISO)
        // The date change will trigger a re-fetch via the effect below.
        setLoadingSlots(false)
        return
      }
      setSlots(result)
      setLoadingSlots(false)
    },
    [],
  )

  // Re-fetch whenever date or party changes.
  useEffect(() => {
    if (overCapacity) {
      setSlots([])
      setLoadingSlots(false)
      return
    }
    fetchSlots(date, partyNum)
  }, [date, partyNum, overCapacity, fetchSlots])

  function selectSlot(time: string) {
    setSlot(time)
    setStep("details")
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { confCode: code, error } = await createReservation({
      guestName: name,
      partySize: Number(party),
      date,
      time: slot!,
      phone,
    })
    setSubmitting(false)
    if (error) {
      toast.error("Could not confirm reservation", { description: error })
      return
    }
    setConfCode(code)
    setStep("done")
    toast.success("Reservation confirmed", {
      description: `${name}, party of ${party} · ${formatDate(date)} at ${slot}`,
    })
  }

  function reset() {
    setStep("slots")
    setSlot(null)
    setName("")
    setPhone("")
    setConfCode("")
  }

  const labelCls = dark ? "text-white/55" : "text-muted-foreground"
  // Shared input skin for dark card
  const inputCls = dark
    ? "bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/20 [color-scheme:dark]"
    : ""
  // Select trigger needs explicit transparent bg + white text to override any browser/dark defaults
  const selectTriggerCls = dark
    ? "bg-transparent hover:bg-white/10 border-white/15 text-white [&_svg]:text-white/60 dark:bg-transparent dark:hover:bg-white/10 focus-visible:ring-white/20"
    : ""

  return (
    <div className={cn("p-5 md:p-6", dark ? "bg-transparent" : "bg-card")}>
      {step === "done" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center duration-500 animate-in fade-in">
          <span className="relative mb-1 flex size-16 items-center justify-center duration-500 zoom-in-50 animate-in">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/30 [animation-iteration-count:3]" />
            <span className="relative flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="size-8" strokeWidth={2.5} />
            </span>
          </span>
          <h3 className="font-heading text-2xl font-semibold">
            Table reserved
          </h3>
          <p className="max-w-xs text-pretty text-sm text-muted-foreground">
            A confirmation was sent to {name || "your phone"}. We can&apos;t wait
            to host you.
          </p>

          <dl className="mt-2 w-full divide-y divide-border rounded-lg border border-border bg-secondary/40 text-left text-sm duration-700 fade-in slide-in-from-bottom-2 animate-in">
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-muted-foreground">Guest</dt>
              <dd className="font-medium">{name || "Guest"}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-muted-foreground">When</dt>
              <dd className="font-medium">
                {formatDate(date)} · {slot}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-muted-foreground">Party</dt>
              <dd className="font-medium">
                {party} {Number(party) === 1 ? "guest" : "guests"}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-muted-foreground">Confirmation</dt>
              <dd className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold tracking-widest text-primary">
                {confCode}
              </dd>
            </div>
          </dl>

          <Button variant="outline" onClick={reset} className="mt-3">
            Make another reservation
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={cn("flex items-center gap-1.5 text-xs font-medium", labelCls)}>
                <Users className="size-3.5" /> Party size
              </Label>
              <Select
                value={party}
                onValueChange={(v) => {
                  setParty(v ?? "")
                  setSlot(null)
                  setStep("slots")
                }}
              >
                <SelectTrigger className={cn("w-full", selectTriggerCls)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className={cn(
                    dark &&
                      "border border-white/10 bg-[oklch(0.18_0.015_40/0.88)] text-white shadow-2xl shadow-black/60 backdrop-blur-xl [&_.scroll-area-scrollbar]:bg-white/10",
                  )}
                >
                  {PARTY_SIZES.map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      className={cn(
                        dark &&
                          "text-white/90 focus:bg-white/12 focus:text-white not-data-[variant=destructive]:focus:**:text-white data-[state=checked]:text-white",
                      )}
                    >
                      {n} {n === 1 ? "guest" : "guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="res-date"
                className={cn("flex items-center gap-1.5 text-xs font-medium", labelCls)}
              >
                <CalendarDays className="size-3.5" /> Date
              </Label>
              <input
                id="res-date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(e.target.value)
                    setSlot(null)
                    setStep("slots")
                  }
                }}
                style={{
                  // Force the browser's calendar popup into dark mode so it
                  // matches our glassmorphic card instead of the OS default.
                  colorScheme: dark ? "dark" : "light",
                  // Warm terracotta accent replaces the default blue selection ring.
                  accentColor: dark ? "oklch(0.50 0.155 35)" : undefined,
                }}
                className={cn(
                  "flex h-9 w-full rounded-lg border px-3 py-1 text-sm transition-colors outline-none",
                  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  dark
                    ? "border-white/15 bg-white/10 text-white [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/20"
                    : "border-input bg-transparent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
                )}
              />
            </div>
          </div>

          {overCapacity ? (
            <p className={cn("mt-4 rounded-md px-3 py-2.5 text-sm", dark ? "bg-white/10 text-white/60" : "bg-secondary text-muted-foreground")}>
              For parties larger than {MAX_CAPACITY}, please call us at the number
              below so we can arrange seating.
            </p>
          ) : (
            <div className="mt-4">
              <Label className={cn("flex items-center gap-1.5 text-xs font-medium", labelCls)}>
                <Clock className="size-3.5" /> Available times
              </Label>
              {loadingSlots ? (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("h-9 animate-pulse rounded-full", dark ? "bg-white/10" : "bg-muted")}
                    />
                  ))}
                </div>
              ) : slots.every((s) => !s.available) ? (
                <p className={cn("mt-2 rounded-md px-3 py-2.5 text-sm", dark ? "bg-white/10 text-white/50" : "bg-secondary text-muted-foreground")}>
                  No availability for this date and party size. Try another day.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map(({ time, available }) => (
                    <button
                      key={time}
                      type="button"
                      disabled={!available}
                      onClick={() => selectSlot(time)}
                      className={cn(
                        "rounded-full border py-2 text-xs font-medium tracking-wide transition-all duration-150",
                        // dark unavailable
                        dark && !available &&
                          "cursor-not-allowed border-white/10 bg-white/5 text-white/20 line-through",
                        // dark selected
                        dark && available && slot === time &&
                          "border-primary bg-primary text-white shadow-sm",
                        // dark idle
                        dark && available && slot !== time &&
                          "border-white/20 bg-white/8 text-white/80 hover:border-white/50 hover:text-white",
                        // light unavailable
                        !dark && !available &&
                          "cursor-not-allowed border-border bg-muted text-muted-foreground/40 line-through",
                        // light selected
                        !dark && available && slot === time &&
                          "border-primary bg-primary text-primary-foreground shadow-sm",
                        // light idle
                        !dark && available && slot !== time &&
                          "border-border bg-background hover:border-primary/60 hover:text-primary",
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "details" && slot ? (
            <form
              onSubmit={confirm}
              className={cn("mt-5 space-y-3 border-t pt-5", dark ? "border-white/10" : "border-border")}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="res-name" className={dark ? "text-white/70" : ""}>Full name</Label>
                  <Input
                    id="res-name"
                    required
                    value={name}
                    className={inputCls}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jamie Rivera"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res-phone" className={dark ? "text-white/70" : ""}>Phone</Label>
                  <Input
                    id="res-phone"
                    required
                    type="tel"
                    value={phone}
                    className={inputCls}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(503) 555-0100"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirming…
                  </>
                ) : (
                  <>Confirm reservation · {slot}</>
                )}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

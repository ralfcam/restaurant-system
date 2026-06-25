"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Users, Clock, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { TIME_SLOTS, UNAVAILABLE_SLOTS, TABLES } from "@/lib/data"
import { createReservation } from "@/app/actions/reservations"
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

export function ReservationWidget() {
  const [party, setParty] = useState("2")
  const [date, setDate] = useState(todayISO())
  const [slot, setSlot] = useState<string | null>(null)
  const [step, setStep] = useState<"slots" | "details" | "done">("slots")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confCode, setConfCode] = useState("")

  const partyNum = Number(party)
  const overCapacity = partyNum > MAX_CAPACITY

  // Availability engine (mock): a slot is open unless it's flagged full
  // or the party exceeds the largest table.
  const slots = useMemo(() => {
    return TIME_SLOTS.map((time) => ({
      time,
      available: !UNAVAILABLE_SLOTS.includes(time) && !overCapacity,
    }))
  }, [overCapacity])

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

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-foreground/5 md:p-6">
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
              <dd className="font-mono font-medium tracking-wide text-primary">
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
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTY_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="res-date"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <CalendarDays className="size-3.5" /> Date
              </Label>
              <Input
                id="res-date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value)
                  setSlot(null)
                  setStep("slots")
                }}
              />
            </div>
          </div>

          {overCapacity ? (
            <p className="mt-4 rounded-md bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
              For parties larger than {MAX_CAPACITY}, please call us at the number
              below so we can arrange seating.
            </p>
          ) : (
            <div className="mt-4">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="size-3.5" /> Available times
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map(({ time, available }) => (
                  <button
                    key={time}
                    type="button"
                    disabled={!available}
                    onClick={() => selectSlot(time)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                      !available &&
                        "cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through",
                      available &&
                        slot === time &&
                        "border-primary bg-primary text-primary-foreground",
                      available &&
                        slot !== time &&
                        "border-border bg-background hover:border-primary hover:text-primary",
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "details" && slot ? (
            <form
              onSubmit={confirm}
              className="mt-5 space-y-3 border-t border-border pt-5"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="res-name">Full name</Label>
                  <Input
                    id="res-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jamie Rivera"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res-phone">Phone</Label>
                  <Input
                    id="res-phone"
                    required
                    type="tel"
                    value={phone}
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

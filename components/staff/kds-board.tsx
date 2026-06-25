"use client"

import { useEffect, useState } from "react"
import { Clock, ArrowRight, Check, AlarmClock } from "lucide-react"
import { type OrderTicket, type OrderTicketStatus } from "@/lib/data"
import { useOrders, advanceOrder, bumpOrder } from "@/lib/order-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const COLUMNS: {
  status: OrderTicketStatus
  title: string
  accent: string
}[] = [
  { status: "new", title: "New", accent: "border-t-chart-3" },
  { status: "preparing", title: "Preparing", accent: "border-t-primary" },
  { status: "ready", title: "Ready", accent: "border-t-accent" },
]

// Service-level thresholds (minutes) used to color tickets by urgency.
const WARN_MIN = 8
const LATE_MIN = 12

// Ticks every second so elapsed timers and the header clock stay live.
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function KdsBoard() {
  const orders = useOrders()
  const now = useNow()

  const active = orders.filter((o) => o.status !== "ready")
  const lateCount = active.filter(
    (o) => (now - o.placedAtMs) / 60_000 >= LATE_MIN,
  ).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          <span className="font-medium">Live</span>
          <span className="text-muted-foreground">
            · {active.length} active{" "}
            {active.length === 1 ? "ticket" : "tickets"}
          </span>
          {lateCount > 0 ? (
            <span className="ml-1 flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              <AlarmClock className="size-3" /> {lateCount} running late
            </span>
          ) : null}
        </div>
        <span className="font-heading text-xl font-semibold tabular-nums">
          {new Date(now).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status)
          return (
            <section key={col.status} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold">
                  {col.title}
                </h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-medium tabular-nums">
                  {colOrders.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {colOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    No tickets
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <TicketCard
                      key={order.id}
                      order={order}
                      accent={col.accent}
                      now={now}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function elapsedLabel(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function TicketCard({
  order,
  accent,
  now,
}: {
  order: OrderTicket
  accent: string
  now: number
}) {
  const itemCount = order.lines.reduce((s, l) => s + l.qty, 0)
  const elapsedMs = now - order.placedAtMs
  const elapsedMin = elapsedMs / 60_000
  const isReady = order.status === "ready"
  const late = !isReady && elapsedMin >= LATE_MIN
  const warn = !isReady && !late && elapsedMin >= WARN_MIN

  return (
    <article
      className={cn(
        "rounded-xl border border-t-4 border-border bg-card p-4 shadow-sm transition-colors",
        accent,
        late && "border-destructive/40 ring-1 ring-destructive/30",
        warn && "border-chart-3/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-lg font-semibold">
          Table {order.table}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums",
            isReady && "text-muted-foreground",
            warn && "bg-chart-3/15 text-chart-3",
            late && "animate-pulse bg-destructive/15 text-destructive",
            !isReady && !warn && !late && "text-foreground",
          )}
        >
          <Clock className="size-3.5" /> {elapsedLabel(elapsedMs)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {order.id.toUpperCase()} · {order.server} · {itemCount} items · in at{" "}
        {order.placedAt}
      </p>

      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
        {order.lines.map((line, i) => (
          <li key={i} className="text-sm">
            <span className="flex items-baseline gap-2">
              <span className="font-heading font-semibold tabular-nums text-primary">
                {line.qty}×
              </span>
              <span className="font-medium">{line.name}</span>
            </span>
            {line.notes ? (
              <span className="ml-6 text-xs font-medium text-destructive">
                {line.notes}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {isReady ? (
          <Button
            variant="outline"
            className="w-full text-accent hover:text-accent"
            onClick={() => bumpOrder(order.id)}
          >
            <Check className="size-4" /> Picked up
          </Button>
        ) : (
          <Button className="w-full" onClick={() => advanceOrder(order.id)}>
            {order.status === "new" ? "Start preparing" : "Mark ready"}
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </article>
  )
}

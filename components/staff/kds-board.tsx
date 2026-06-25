"use client"

import { Clock, ArrowRight, Check } from "lucide-react"
import {
  type OrderTicket,
  type OrderTicketStatus,
} from "@/lib/data"
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

export function KdsBoard() {
  const orders = useOrders()

  return (
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
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TicketCard({
  order,
  accent,
}: {
  order: OrderTicket
  accent: string
}) {
  const itemCount = order.lines.reduce((s, l) => s + l.qty, 0)
  return (
    <article
      className={cn(
        "rounded-xl border border-t-4 border-border bg-card p-4 shadow-sm",
        accent,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-lg font-semibold">
          Table {order.table}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="size-3.5" /> {order.placedAt}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {order.id.toUpperCase()} · {order.server} · {itemCount} items
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
        {order.status === "ready" ? (
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

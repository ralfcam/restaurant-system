"use client"

import { useState } from "react"
import { Plus, Trash2, Minus, Users } from "lucide-react"
import { toast } from "sonner"
import {
  TABLES,
  TABLE_STATUS_META,
  type RestaurantTable,
  type TableStatus,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const STATUS_ORDER: TableStatus[] = [
  "available",
  "reserved",
  "seated",
  "cleaning",
]

export function FloorPlan() {
  const [tables, setTables] = useState<RestaurantTable[]>(TABLES)
  const [selectedId, setSelectedId] = useState<string | null>(TABLES[0]?.id ?? null)

  const selected = tables.find((t) => t.id === selectedId) ?? null

  function setStatus(id: string, status: TableStatus) {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t)),
    )
  }

  function adjustSeats(id: string, delta: number) {
    setTables((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, seats: Math.max(1, Math.min(12, t.seats + delta)) }
          : t,
      ),
    )
  }

  function addTable() {
    const nextNum =
      Math.max(0, ...tables.map((t) => Number(t.label) || 0)) + 1
    const newTable: RestaurantTable = {
      id: `t-${Date.now()}`,
      label: String(nextNum),
      seats: 2,
      status: "available",
      x: 0,
      y: 0,
      shape: "round",
    }
    setTables((prev) => [...prev, newTable])
    setSelectedId(newTable.id)
    toast.success(`Table ${nextNum} added`)
  }

  function removeTable(id: string) {
    const t = tables.find((x) => x.id === id)
    setTables((prev) => prev.filter((x) => x.id !== id))
    if (selectedId === id) setSelectedId(null)
    if (t) toast.success(`Table ${t.label} removed`)
  }

  const totalSeats = tables.reduce((s, t) => s + t.seats, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Floor grid */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Dining Room</h2>
            <p className="text-sm text-muted-foreground">
              {tables.length} tables · {totalSeats} seats
            </p>
          </div>
          <Button size="sm" onClick={addTable}>
            <Plus className="size-4" /> Add table
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 rounded-lg border border-dashed border-border bg-secondary/30 p-5">
          {tables.map((t) => {
            const meta = TABLE_STATUS_META[t.status]
            const isSelected = t.id === selectedId
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center border-2 text-center transition-all",
                  t.shape === "round" && "rounded-full",
                  t.shape === "square" && "rounded-lg",
                  t.shape === "rect" && "rounded-lg",
                  t.seats <= 2 ? "size-20" : t.seats <= 4 ? "size-24" : "h-24 w-32",
                  meta.color,
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                    : "hover:brightness-95",
                )}
              >
                <span className="font-heading text-lg font-semibold leading-none">
                  {t.label}
                </span>
                <span className="mt-1 flex items-center gap-0.5 text-xs">
                  <Users className="size-3" /> {t.seats}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {STATUS_ORDER.map((status) => (
            <span
              key={status}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className={`size-2.5 rounded-full ${TABLE_STATUS_META[status].dot}`}
              />
              {TABLE_STATUS_META[status].label}
            </span>
          ))}
        </div>
      </div>

      {/* Inspector */}
      <div className="rounded-xl border border-border bg-card p-5">
        {selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Selected
              </p>
              <h3 className="font-heading text-2xl font-semibold">
                Table {selected.label}
              </h3>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatus(selected.id, status)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                      selected.status === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {TABLE_STATUS_META[status].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Seat capacity</p>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustSeats(selected.id, -1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-10 text-center font-heading text-2xl font-semibold tabular-nums">
                  {selected.seats}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => adjustSeats(selected.id, 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => removeTable(selected.id)}
            >
              <Trash2 className="size-4" /> Remove table
            </Button>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Select a table to edit its status and capacity.
          </p>
        )}
      </div>
    </div>
  )
}

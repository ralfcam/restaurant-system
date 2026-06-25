"use client"

import { useState } from "react"
import { Plus, Minus, Trash2, Send, Receipt, ChefHat } from "lucide-react"
import { toast } from "sonner"
import {
  MENU_ITEMS,
  MENU_CATEGORIES,
  TABLES,
  SERVERS,
  type MenuItem,
  type OrderLine,
} from "@/lib/data"
import { addOrder } from "@/lib/order-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TAX_RATE = 0.0875

export function PosTerminal() {
  const [category, setCategory] = useState(MENU_CATEGORIES[0])
  const [cart, setCart] = useState<OrderLine[]>([])
  const [table, setTable] = useState(TABLES[0]?.label ?? "1")
  const [server, setServer] = useState(SERVERS[0])

  const items = MENU_ITEMS.filter((m) => m.category === category)

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id)
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l,
        )
      }
      return [...prev, { itemId: item.id, name: item.name, qty: 1 }]
    })
  }

  function changeQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    )
  }

  function priceOf(itemId: string) {
    return MENU_ITEMS.find((m) => m.id === itemId)?.price ?? 0
  }

  const subtotal = cart.reduce((s, l) => s + priceOf(l.itemId) * l.qty, 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  function sendToKitchen() {
    if (cart.length === 0) return
    addOrder({ table, server, lines: cart })
    toast.success(`Order sent to kitchen · Table ${table}`, {
      description: `${cart.reduce((s, l) => s + l.qty, 0)} items fired`,
    })
    setCart([])
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Menu pad */}
      <div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {MENU_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => addItem(item)}
              className="flex h-28 flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary active:scale-[0.98]"
            >
              <span className="font-medium leading-tight">{item.name}</span>
              <span className="font-heading text-lg font-semibold text-primary">
                ${item.price}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Order ticket */}
      <div className="flex flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
            <Receipt className="size-5 text-primary" /> Current Order
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Table</label>
              <Select
                value={table}
                onValueChange={(v) => setTable(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLES.map((t) => (
                    <SelectItem key={t.id} value={t.label}>
                      Table {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Server</label>
              <Select
                value={server}
                onValueChange={(v) => setServer(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tap menu items to build the order.
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((line) => (
                <li
                  key={line.itemId}
                  className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${priceOf(line.itemId).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => changeQty(line.itemId, -1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium tabular-nums">
                      {line.qty}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => changeQty(line.itemId, 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <span className="w-14 text-right text-sm font-medium tabular-nums">
                    ${(priceOf(line.itemId) * line.qty).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">${subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Tax (8.75%)</dt>
              <dd className="tabular-nums">${tax.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-heading text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">${total.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={cart.length === 0}
              onClick={() => setCart([])}
            >
              <Trash2 className="size-4" /> Clear
            </Button>
            <Button
              className="flex-[2]"
              disabled={cart.length === 0}
              onClick={sendToKitchen}
            >
              <Send className="size-4" /> Send to kitchen
            </Button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <ChefHat className="size-3.5" /> Fires instantly to the Kitchen
            Display
          </p>
        </div>
      </div>
    </div>
  )
}

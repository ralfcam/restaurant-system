"use client"

import { useState } from "react"
import { Plus, Minus, Trash2, Send, Receipt, ChefHat } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { MENUS, type MenuId, type OrderLine } from "@/lib/data"
import {
  createKitchenOrder,
  type PersistedServer,
  type PersistedTable,
} from "@/app/actions/operations"
import type { MenuItemRow } from "@/app/actions/menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TAX_RATE = 0.077

type PosTerminalProps = {
  tables: PersistedTable[]
  servers: PersistedServer[]
  items: MenuItemRow[]
}

export function PosTerminal({ tables, servers, items }: PosTerminalProps) {
  const t = useTranslations()
  const [menuId, setMenuId] = useState<MenuId>(MENUS[0]?.id ?? "soir")
  const [cart, setCart] = useState<OrderLine[]>([])
  const [table, setTable] = useState(tables[0]?.label ?? "")
  const [server, setServer] = useState(servers[0]?.name ?? "")
  const [sending, setSending] = useState(false)

  const pickerItems = items.filter((item) => item.menu_id === menuId)

  function addItem(item: MenuItemRow) {
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
    return items.find((item) => item.id === itemId)?.price_value ?? 0
  }

  const subtotal = cart.reduce((s, l) => s + priceOf(l.itemId) * l.qty, 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const money = (amount: number) =>
    t("staff.pos.money", { amount: amount.toFixed(2) })
  const tableChoices = tables.map((row) => ({
    id: row.id,
    value: row.label,
    label: t("staff.pos.tableOption", { label: row.label }),
  }))

  async function sendToKitchen() {
    if (cart.length === 0 || sending) return
    setSending(true)
    try {
      const result = await createKitchenOrder({
        table,
        server,
        lines: cart.map(({ itemId, qty, notes }) => ({ itemId, qty, notes })),
      })
      toast.success(
        t("staff.pos.sentToKitchen", {
          orderNumber: result.orderNumber,
          table,
        }),
        {
          description: t("staff.pos.itemsFired", {
            count: cart.reduce((sum, line) => sum + line.qty, 0),
          }),
        },
      )
      setCart([])
    } catch {
      toast.error(t("staff.pos.sendFailed"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {MENUS.map((menu) => (
            <button
              key={menu.id}
              type="button"
              onClick={() => setMenuId(menu.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                menuId === menu.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {menu.title}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pickerItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addItem(item)}
              className="flex h-28 flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary active:scale-[0.98]"
            >
              <span className="line-clamp-2 font-medium leading-tight">
                {item.name}
              </span>
              <span className="font-heading text-lg font-semibold text-primary">
                {item.price}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
            <Receipt className="size-5 text-primary" />{" "}
            {t("staff.pos.currentOrder")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">
                {t("staff.pos.tableLabel")}
              </label>
              <Select
                value={table || undefined}
                onValueChange={(v) => setTable(v ?? "")}
                disabled={tables.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("staff.pos.noTables")} />
                </SelectTrigger>
                <SelectContent>
                  {tableChoices.map((row) => (
                    <SelectItem key={row.id} value={row.value}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {t("staff.pos.serverLabel")}
              </label>
              <Select
                value={server || undefined}
                onValueChange={(v) => setServer(v ?? "")}
                disabled={servers.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("staff.pos.noServers")} />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((row) => (
                    <SelectItem key={row.id} value={row.name}>
                      {row.name}
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
              {t("staff.pos.emptyCart")}
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
                      {money(priceOf(line.itemId))}
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
                  <span className="w-16 text-right text-sm font-medium tabular-nums">
                    {money(priceOf(line.itemId) * line.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("staff.pos.subtotal")}</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>
                {t("staff.pos.tax", { rate: (TAX_RATE * 100).toFixed(1) })}
              </dt>
              <dd className="tabular-nums">{money(tax)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-heading text-lg font-semibold">
              <dt>{t("staff.pos.total")}</dt>
              <dd className="tabular-nums">{money(total)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={cart.length === 0}
              onClick={() => setCart([])}
            >
              <Trash2 className="size-4" /> {t("staff.pos.clear")}
            </Button>
            <Button
              className="flex-[2]"
              disabled={cart.length === 0 || sending}
              onClick={sendToKitchen}
            >
              <Send className="size-4" />{" "}
              {sending ? t("staff.pos.sending") : t("staff.pos.send")}
            </Button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <ChefHat className="size-3.5" /> {t("staff.pos.firesInstantly")}
          </p>
        </div>
      </div>
    </div>
  )
}

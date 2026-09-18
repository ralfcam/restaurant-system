/**
 * FP-15 seated-chip bill: sum persisted `orders.total` by `table_label`.
 * Exclude only `cancelled` and `voided` — `completed` still counts.
 */

type OrderTotalRow = {
  table_label: string
  total: number
  status: string
}

/** Export name is locked to the C1 test import; not kitchen-open-only. */
export function sumOpenOrderTotalsByTableLabel(
  orders: OrderTotalRow[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "voided") continue
    totals[order.table_label] = (totals[order.table_label] ?? 0) + order.total
  }
  return totals
}

/**
 * FP-15 seated-chip bill: sum persisted `orders.total` by `reservation_id`.
 * Exclude only `cancelled` and `voided` — `completed` still counts.
 * A null `reservation_id` is not a visit and creates no key.
 */

type OrderTotalRow = {
  reservation_id: string | null
  total: number
  status: string
}

export function sumOpenOrderTotalsByReservationId(
  orders: OrderTotalRow[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const order of orders) {
    if (order.reservation_id == null) continue
    if (order.status === "cancelled" || order.status === "voided") continue
    totals[order.reservation_id] =
      (totals[order.reservation_id] ?? 0) + order.total
  }
  return totals
}

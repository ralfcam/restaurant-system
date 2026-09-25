import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { TABLE_STATUS_META } from "@/lib/data"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"

const RESERVATION_KEYS = {
  confirmed: "status.reservation.confirmed",
  seated: "status.reservation.seated",
  completed: "status.reservation.completed",
  cancelled: "status.reservation.cancelled",
  no_show: "status.reservation.noShow",
} as const

const TABLE_KEYS = {
  available: "status.table.available",
  seated: "status.table.seated",
  reserved: "status.table.reserved",
  cleaning: "status.table.cleaning",
  out_of_service: "status.table.outOfService",
} as const

const KITCHEN_KEYS = {
  new: "status.kitchen.new",
  preparing: "status.kitchen.preparing",
  ready: "status.kitchen.ready",
} as const

const INQUIRY_KEYS = {
  open: "status.inquiry.open",
  contacted: "status.inquiry.contacted",
  declined: "status.inquiry.declined",
  closed: "status.inquiry.closed",
} as const

const WEEKLY_KEYS = {
  available: "status.weekly.available",
  fully_booked: "status.weekly.fullyBooked",
} as const

const STATUS_KEYS = [
  ...Object.values(RESERVATION_KEYS),
  ...Object.values(TABLE_KEYS),
  ...Object.values(KITCHEN_KEYS),
  ...Object.values(INQUIRY_KEYS),
  ...Object.values(WEEKLY_KEYS),
]

const RESERVATION_ENUMS = [
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
] as const

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8")
}

function resolveLeaf(catalog: unknown, key: string): unknown {
  let node: unknown = catalog
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      return undefined
    }
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

/** `label: "..."` or `label: t("...")` values keyed by the preceding enum. */
function labelMap(
  source: string,
  keys: readonly string[],
): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const key of keys) {
    const match = source.match(
      new RegExp(`${key}:\\s*\\{[^}]*?label:\\s*(?:t\\(\\s*)?["']([^"']+)["']`),
    )
    if (match?.[1]) labels[key] = match[1]
  }
  return labels
}

function kitchenTitles(source: string): Record<string, string> {
  const columns = source.indexOf("const COLUMNS")
  const start = source.indexOf("= [", columns)
  const end = source.indexOf("]", start)
  const block = start === -1 ? "" : source.slice(start, end)
  const titles: Record<string, string> = {}
  for (const match of block.matchAll(
    /status:\s*"([^"]+)"\s*,\s*title:\s*(?:t\(\s*)?["']([^"']+)["']/g,
  )) {
    titles[match[1]] = match[2]
  }
  return titles
}

function inquiryLabels(source: string): Record<string, string> {
  const keys = Object.keys(INQUIRY_KEYS)
  const labels: Record<string, string> = {}
  for (const key of keys) {
    const match = source.match(
      new RegExp(`${key}:\\s*(?:t\\(\\s*)?["']([^"']+)["']`),
    )
    if (match?.[1]) labels[key] = match[1]
  }
  if (Object.keys(labels).length === keys.length) return labels
  if (/\{inquiry\.status\}/.test(source)) {
    return Object.fromEntries(keys.map((key) => [key, "inquiry.status"]))
  }
  return labels
}

function weeklyLabels(source: string): {
  available: string
  fully_booked: string
} {
  const ternary = source.match(
    /\{available \? (?:t\(\s*)?["']([^"']+)["']\)? : (?:t\(\s*)?["']([^"']+)["']\}/,
  )
  if (ternary?.[1] && ternary[2]) {
    return { available: ternary[1], fully_booked: ternary[2] }
  }
  const available = source.match(/available:\s*(?:t\(\s*)?["']([^"']+)["']/)
  const fullyBooked = source.match(
    /fully_booked:\s*(?:t\(\s*)?["']([^"']+)["']/,
  )
  return {
    available: available?.[1] ?? "",
    fully_booked: fullyBooked?.[1] ?? "",
  }
}

function undoToastRendersRawEnum(source: string): boolean {
  const updateStart = source.indexOf("async function updateStatus")
  const undoStart = source.indexOf("async function undoStatus")
  const updateBlock = source.slice(updateStart, undoStart)
  const undoBlock = source.slice(
    undoStart,
    source.indexOf("return (", undoStart),
  )
  const labelValues = [...updateBlock.matchAll(/:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  )
  return (
    labelValues.some((value) =>
      (RESERVATION_ENUMS as readonly string[]).includes(value),
    ) || /restoredStatus\.replace\(/.test(undoBlock)
  )
}

describe("status labels from catalog", () => {
  it("reservation, table, kitchen-ticket, inquiry, and weekly-overview maps expose status.* keys", () => {
    const reservationSource = read("components/staff/reservation-status.tsx")
    const kitchenSource = read("components/staff/kds-board.tsx")
    const inquirySource = read("components/staff/inquiries-manager.tsx")
    const weeklySource = read("components/staff/weekly-service-overview.tsx")

    const tableLabels = Object.fromEntries(
      Object.entries(TABLE_STATUS_META).map(([status, meta]) => [
        status,
        meta.label,
      ]),
    )

    expect({
      reservation: labelMap(reservationSource, Object.keys(RESERVATION_KEYS)),
      table: tableLabels,
      kitchen: kitchenTitles(kitchenSource),
      inquiry: inquiryLabels(inquirySource),
      weekly: weeklyLabels(weeklySource),
    }).toEqual({
      reservation: RESERVATION_KEYS,
      table: TABLE_KEYS,
      kitchen: KITCHEN_KEYS,
      inquiry: INQUIRY_KEYS,
      weekly: WEEKLY_KEYS,
    })
  })

  it("status.* leaves are non-empty and French differs from English", () => {
    for (const key of STATUS_KEYS) {
      expectCatalogKey(key)
      expect(resolveLeaf(fr, key), `fr ${key}`).not.toBe(resolveLeaf(en, key))
    }
  })

  it("inquiries, the customer ficha, POS, and the undo toast do not render raw enum values", () => {
    const inquiries = read("components/staff/inquiries-manager.tsx")
    const ficha = read("app/admin/customers/[email]/page.tsx")
    const pos = [
      read("components/staff/pos-terminal.tsx"),
      read("app/pos/page.tsx"),
    ].join("\n")
    const reservations = read("components/staff/reservations-manager.tsx")

    expect({
      inquiries: /\{inquiry\.status\}/.test(inquiries),
      ficha: /\{row\.status\}/.test(ficha),
      pos: /\{(?:table|order|row)\.status\}/.test(pos),
      undoToast: undoToastRendersRawEnum(reservations),
    }).toEqual({
      inquiries: false,
      ficha: false,
      pos: false,
      undoToast: false,
    })
  })
})

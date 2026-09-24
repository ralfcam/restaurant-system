import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function catalogLeaf(catalog: unknown, key: string): unknown {
  let node: unknown = catalog
  for (const part of key.split(".")) {
    if (!isRecord(node) || !Object.hasOwn(node, part)) return undefined
    node = node[part]
  }
  return node
}

const OPERATIONAL_LABELS = {
  staffOnly: "Staff-only • Operational data only",
  emailReadOnly: "Email (read-only)",
  notesOperational: "Notes (operational only)",
  notesHelper: "Use for reservation-related notes only.",
  operationalLimit: "Data shown is limited to reservation operations.",
} as const

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type Row = Record<string, unknown>

type GuestProfileActions = {
  getGuestProfile: (email: string) => Promise<{ error?: string }>
}

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      return () => self
    },
  })
  return self
}

const root = process.cwd()
const customersPage = path.join(root, "app/admin/customers/[email]/page.tsx")

function resolveImportedChrome(spec: string) {
  if (spec.includes("staff-shell")) return []
  const rel = spec.startsWith("@/")
    ? spec.slice(2)
    : path.posix.normalize(path.posix.join("app/admin/customers/[email]", spec))
  return [rel, `${rel}.tsx`, `${rel}.ts`]
    .map((candidate) => path.join(root, candidate))
    .filter((abs) => existsSync(abs))
}

function fichaChromeSource() {
  const page = readFileSync(customersPage, "utf8")
  const imported = [...page.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((spec) => spec.startsWith("@/components/") || spec.startsWith("."))
    .flatMap(resolveImportedChrome)
  return [page, ...imported.map((abs) => readFileSync(abs, "utf8"))].join("\n")
}

describe("guest profile staff gate", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("staff guest profile is gated at /admin/customers", async () => {
    expect(existsSync(customersPage)).toBe(true)

    const actions =
      (await import("@/app/actions/guest-profiles")) as GuestProfileActions

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.createServiceClient.mockClear()
    const unauthorized = await actions.getGuestProfile("ada@ex.com")
    expect(unauthorized).toMatchObject({
      error: "errors.guestProfiles.unauthorized",
    })
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    for (const user of [{ id: "staff-1" }, { id: "super-admin-1" }]) {
      mocks.requireStaffUser.mockResolvedValue(user)
      mocks.createServiceClient.mockClear()
      const result = await actions.getGuestProfile("ada@ex.com")
      expect(result.error).not.toBe("errors.guestProfiles.unauthorized")
      expect(mocks.createServiceClient).toHaveBeenCalled()
    }
  })

  it("staff ficha save control writes name and phone and not email", () => {
    const chrome = fichaChromeSource()
    const callSite =
      chrome.match(/\bupdateGuestProfilePii\s*\([\s\S]{0,400}/)?.[0] ?? ""

    expect(callSite).toMatch(/\bupdateGuestProfilePii\s*\(/)
    expect(callSite).toMatch(/\bguest_name\b/)
    expect(callSite).toMatch(/\bphone\b/)
    expect(chrome).toMatch(/\bSave\b/)
    expect(chrome).not.toMatch(/type=["']email["']/)
  })

  it("staff ficha save shows success and error feedback", () => {
    const chrome = fichaChromeSource()
    const saveHandler =
      chrome.match(/async function saveGuestPii[\s\S]*?\n  \}/)?.[0] ?? ""

    expect(saveHandler).toMatch(
      /await\s+updateGuestProfilePii\s*\([\s\S]*?\bemail\s*:\s*profile\.email\b[\s\S]*?toast\.error\(\s*t\([\s\S]*?toast\.success\(\s*t\(\s*["']staff\.customers\.saved["']\s*\)\s*\)/,
    )
  })

  it("staff ficha displays guest_name email phone notes", () => {
    const chrome = fichaChromeSource()

    expect(chrome).toMatch(/\bprofile\??\.guest_name\b/)
    expect(chrome).toMatch(/\bprofile\??\.email\b/)
    expect(chrome).toMatch(/\bprofile\??\.phone\b/)
    expect(chrome).toMatch(/\bprofile\??\.notes\b/)
    expect(chrome).not.toMatch(/type=["']email["']/)
  })

  it("staff ficha lists date time party_size status", () => {
    const chrome = fichaChromeSource()
    const historyList =
      chrome.match(
        /profile\??\.history\??[\s\S]{0,200}?\.(?:map|flatMap)\s*\([\s\S]{0,800}/,
      )?.[0] ?? ""

    expect(historyList).toMatch(/profile\??\.history\??/)
    expect(historyList).toMatch(/\.(?:map|flatMap)\s*\(/)
    expect(historyList).toMatch(/\.\s*date\b/)
    expect(historyList).toMatch(/\.\s*time\b/)
    expect(historyList).toMatch(/\.\s*party_size\b/)
    expect(historyList).toMatch(/\.\s*status\b/)
  })

  it("staff ficha shows reservation-derived summary only", () => {
    const chrome = fichaChromeSource()

    expect(chrome).toMatch(
      /t\(\s*["']staff\.customers\.totalReservations["']\s*\)/,
    )
    expect(chrome).toMatch(
      /t\(\s*["']staff\.customers\.completedVisits["']\s*\)/,
    )
    expect(chrome).toMatch(/t\(\s*["']staff\.customers\.lastVisit["']\s*\)/)
    expect(chrome).not.toMatch(/["']staff\.customers\.risk["']/)
    expect(chrome).not.toMatch(/["']staff\.customers\.noShowPercent["']/)
    expect(chrome).not.toMatch(/["']staff\.customers\.vip["']/)
    expect(chrome).not.toMatch(/["']staff\.customers\.noShowRate["']/)
  })

  it("staff ficha empty key is empty not other guests", () => {
    const chrome = fichaChromeSource()
    const emptyState =
      chrome.match(
        /(?:!profile\??\.history\??(?:\?\.|\.)length|profile\??\.history\??(?:\?\.|\.)length\s*===?\s*0)[\s\S]{0,400}/,
      )?.[0] ?? ""

    expect(emptyState).toMatch(
      /!profile\??\.history\??(?:\?\.|\.)length|profile\??\.history\??(?:\?\.|\.)length\s*===?\s*0/,
    )
    expect(emptyState).toMatch(/not[- ]found|\bempty\b/i)
  })

  it("staff ficha shows operational-only labels and privacy notices", () => {
    for (const [key, english] of Object.entries(OPERATIONAL_LABELS)) {
      expect(catalogLeaf(en, `staff.customers.${key}`)).toBe(english)
    }

    for (const [key, english] of Object.entries(OPERATIONAL_LABELS)) {
      const french = catalogLeaf(fr, `staff.customers.${key}`)
      expect(typeof french).toBe("string")
      if (typeof french === "string") {
        expect(french.trim().length).toBeGreaterThan(0)
        expect(french).not.toBe(english)
      }
    }

    const chrome = fichaChromeSource()
    for (const key of Object.keys(OPERATIONAL_LABELS)) {
      expect(chrome).toMatch(
        new RegExp(String.raw`t\(\s*["']staff\.customers\.${key}["']\s*\)`),
      )
    }

    expect(chrome).toMatch(/\{profile\.notes\}/)
    expect(chrome).not.toMatch(/<(?:input|textarea)\b[^>]*\bnotes\b/)

    expect(chrome).toMatch(/description=\{\s*profile\.email\s*\}/)
    expect(chrome).not.toMatch(/description=\{\s*email\s*\}/)
  })

  it("staff ficha history is a table with visit marker and status badges", () => {
    // Green adds these staff.customers keys (absent today):
    // date, time, partySize, table, status, historyNotes, visit.
    const HISTORY_COLUMNS = {
      date: "Date",
      time: "Time",
      partySize: "Party Size",
      table: "Table",
      status: "Status",
      historyNotes: "Notes",
      visit: "Visit",
    } as const

    const chrome = fichaChromeSource()
    const historyMatch = chrome.match(
      /<(ul|table)\b[\s\S]*?profile\??\.history[\s\S]*?<\/\1>/,
    )
    const historyTable = historyMatch?.[0] ?? ""

    expect(historyMatch?.[1]).toBe("table")

    expect(historyTable).toMatch(/<th\b/)
    for (const key of Object.keys(HISTORY_COLUMNS)) {
      expect(historyTable).toMatch(
        new RegExp(String.raw`t\(\s*["']staff\.customers\.${key}["']\s*\)`),
      )
    }

    expect(historyTable).toMatch(/\brow\.date\b/)
    expect(historyTable).toMatch(/\brow\.time\b/)
    expect(historyTable).toMatch(/\brow\.party_size\b/)
    expect(historyTable).toMatch(/\brow\.table_label\b/)
    expect(historyTable).toMatch(/\brow\.notes\b/)
    expect(historyTable).toMatch(
      /<ReservationStatusBadge\b[\s\S]{0,160}?status=\{row\.status\}/,
    )
    expect(historyTable).toMatch(
      /row\.isVisit[\s\S]{0,240}?t\(\s*["']staff\.customers\.visit["']\s*\)/,
    )

    for (const [key, english] of Object.entries(HISTORY_COLUMNS)) {
      expect(catalogLeaf(en, `staff.customers.${key}`)).toBe(english)
    }
  })
})

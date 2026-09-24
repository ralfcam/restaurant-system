import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
})

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
  getGuestProfile: (email: string) => Promise<unknown>
  updateGuestProfilePii: (input: {
    email: string
    guest_name: string
    phone: string
  }) => Promise<unknown>
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
const GUEST_PROFILE_FILES = [
  "app/actions/guest-profiles.ts",
  "lib/guest-profiles.ts",
] as const
const GRANT_SELECT_ANON = /GRANT\s+SELECT[\s\S]*\b(?:anon|authenticated)\b/i
const piiDraft = {
  email: "ada@ex.com",
  guest_name: "Ada Lovelace",
  phone: "555-0100",
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("guest profile RES-PRIV", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("guest profile reader and mutator use service client and do not grant anon SELECT", async () => {
    const actions =
      (await import("@/app/actions/guest-profiles")) as GuestProfileActions

    mocks.createServiceClient.mockClear()
    await actions.getGuestProfile(piiDraft.email)
    expect(mocks.createServiceClient).toHaveBeenCalled()

    mocks.createServiceClient.mockClear()
    await actions.updateGuestProfilePii(piiDraft)
    expect(mocks.createServiceClient).toHaveBeenCalled()

    mocks.createServiceClient.mockClear()
    mocks.requireStaffUser.mockResolvedValue(null)
    await actions.getGuestProfile(piiDraft.email)
    await actions.updateGuestProfilePii(piiDraft)
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    for (const rel of GUEST_PROFILE_FILES) {
      expect(existsSync(path.join(root, rel))).toBe(true)
      expect(read(rel)).not.toMatch(GRANT_SELECT_ANON)
    }
  })
})

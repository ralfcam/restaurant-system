import { existsSync } from "node:fs"
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
    expect(unauthorized).toMatchObject({ error: "Unauthorized." })
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    for (const user of [{ id: "staff-1" }, { id: "super-admin-1" }]) {
      mocks.requireStaffUser.mockResolvedValue(user)
      mocks.createServiceClient.mockClear()
      const result = await actions.getGuestProfile("ada@ex.com")
      expect(result.error).not.toBe("Unauthorized.")
      expect(mocks.createServiceClient).toHaveBeenCalled()
    }
  })
})

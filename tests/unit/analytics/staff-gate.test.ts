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

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(target, prop) {
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
const analyticsPage = path.join(root, "app/admin/analytics/page.tsx")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("getReservationAnalytics staff gate", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("staff analytics is gated and linked from staff nav", async () => {
    expect(existsSync(analyticsPage)).toBe(true)

    const shell = read("components/staff/staff-shell.tsx")
    expect(shell).toMatch(/href:\s*["']\/admin\/analytics["']/)

    const { getReservationAnalytics } = await import("@/app/actions/analytics")

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await getReservationAnalytics()
    expect(unauthorized).toEqual({ error: "Unauthorized." })
    expect(unauthorized).not.toHaveProperty("outcomes")
    expect(unauthorized).not.toHaveProperty("duration")
    expect(unauthorized).not.toHaveProperty("patterns")
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    const staffResult = await getReservationAnalytics()
    expect((staffResult as { error?: string }).error).not.toBe("Unauthorized.")
    expect(mocks.createServiceClient).toHaveBeenCalled()

    mocks.createServiceClient.mockClear()
    mocks.from.mockClear()
    mocks.requireStaffUser.mockResolvedValue({ id: "super-admin-1" })
    const superAdminResult = await getReservationAnalytics()
    expect((superAdminResult as { error?: string }).error).not.toBe(
      "Unauthorized.",
    )
    expect(mocks.createServiceClient).toHaveBeenCalled()
  })
})

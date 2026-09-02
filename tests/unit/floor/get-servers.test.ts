import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

describe("getServers staff gate and name order", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.from.mockReset()
    mocks.select.mockReset()
    mocks.order.mockReset()
    mocks.from.mockImplementation((table: string) => {
      if (table !== "servers") {
        throw new Error(`unexpected table: ${table}`)
      }
      return { select: mocks.select }
    })
    mocks.select.mockReturnValue({ order: mocks.order })
    mocks.order.mockResolvedValue({
      data: [
        { id: "s2", name: "Priya" },
        { id: "s1", name: "Maya" },
      ],
      error: null,
    })
  })

  it("returns an empty list without querying servers for a non-staff session", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const { getServers } = await import("@/app/actions/operations")
    const servers = await getServers()
    expect(servers).toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("returns mapped {id, name} rows and orders by name for staff", async () => {
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    const { getServers } = await import("@/app/actions/operations")
    const servers = await getServers()
    expect(mocks.from).toHaveBeenCalledWith("servers")
    expect(mocks.order).toHaveBeenCalledWith("name")
    expect(servers).toEqual([
      { id: "s2", name: "Priya" },
      { id: "s1", name: "Maya" },
    ])
  })
})

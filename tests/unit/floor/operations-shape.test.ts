import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  selectExisting: vi.fn(),
  selectCurrent: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (name: string) => {
      if (name !== "tables") return { insert: async () => ({ error: null }) }
      return {
        select: () => ({
          order: async () => mocks.selectExisting(),
          eq: () => ({
            single: mocks.selectCurrent,
          }),
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => mocks.insert(row),
          }),
        }),
        update: (patch: Record<string, unknown>) => {
          mocks.update(patch)
          return { eq: async () => ({ error: null }) }
        },
      }
    },
  }),
}))

describe("table create and seat updates persist parity shape", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.insert.mockReset()
    mocks.update.mockReset()
    mocks.selectExisting.mockReset()
    mocks.selectCurrent.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.selectExisting.mockResolvedValue({ data: [] })
    mocks.selectCurrent.mockResolvedValue({ data: { status: "available" }, error: null })
    mocks.insert.mockImplementation((row: Record<string, unknown>) => ({
      data: { id: "t-new", ...row, x: 0, y: 0 },
      error: null,
    }))
  })

  it("creates a default 2-top as a square table", async () => {
    const { createTable } = await import("@/app/actions/operations")
    const table = await createTable()
    expect(table.shape).toBe("square")
    expect(table.seats).toBe(2)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ seats: 2, shape: "square" }))
  })

  it("writes round when capacity becomes odd and square when even", async () => {
    const { updateTableState } = await import("@/app/actions/operations")
    await updateTableState({ id: "t1", seats: 3 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ seats: 3, shape: "round" }))
    await updateTableState({ id: "t1", seats: 4 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ seats: 4, shape: "square" }))
  })
})

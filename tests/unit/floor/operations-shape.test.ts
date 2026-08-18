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
      if (name !== "tables") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
              single: async () => ({ data: null, error: null }),
            }),
            in: async () => ({ data: [], error: null }),
          }),
          insert: async () => ({ error: null }),
          update: () => ({ eq: async () => ({ error: null }) }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
      }
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
    mocks.selectCurrent.mockResolvedValue({ data: { status: "available", x: 0, y: 0 }, error: null })
    mocks.insert.mockImplementation((row: Record<string, unknown>) => ({
      data: { id: "t-new", ...row },
      error: null,
    }))
  })

  it("creates a default 2-top as a square table", async () => {
    const { createTable } = await import("@/app/actions/operations")
    const table = await createTable()
    expect(table.shape).toBe("square")
    expect(table.seats).toBe(2)
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ seats: 2, shape: "square", expected_minutes: 90, x: 0, y: 0 }),
    )
    expect(table.expectedMinutes).toBe(90)
  })

  it("places a new table on the next free floor cell", async () => {
    mocks.selectExisting.mockResolvedValue({
      data: [
        { label: "1", x: 0, y: 0 },
        { label: "2", x: 1, y: 0 },
      ],
    })
    const { createTable } = await import("@/app/actions/operations")
    await createTable()
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ x: 2, y: 0 }))
  })

  it("persists expected turn time on a standalone table", async () => {
    const { updateTableState } = await import("@/app/actions/operations")
    await updateTableState({ id: "t1", expectedMinutes: 120 })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ expected_minutes: 120 }),
    )
  })

  it("writes round when capacity becomes odd and square when even", async () => {
    const { updateTableState } = await import("@/app/actions/operations")
    await updateTableState({ id: "t1", seats: 3 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ seats: 3, shape: "round" }))
    await updateTableState({ id: "t1", seats: 4 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ seats: 4, shape: "square" }))
  })

  it("persists a spread when stacked tables share the origin cell", async () => {
    mocks.selectExisting.mockResolvedValue({
      data: [
        { id: "t1", label: "1", seats: 2, status: "available", expected_minutes: 90, x: 0, y: 0, shape: "square" },
        { id: "t2", label: "2", seats: 2, status: "available", expected_minutes: 90, x: 0, y: 0, shape: "square" },
      ],
    })
    const { getTables } = await import("@/app/actions/operations")
    const tables = await getTables()
    expect(tables.map((table) => ({ label: table.label, x: table.x, y: table.y }))).toEqual([
      { label: "1", x: 0, y: 0 },
      { label: "2", x: 1, y: 0 },
    ])
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ x: 1, y: 0 }))
  })

  it("persists clamped floor coordinates", async () => {
    const { updateTableState } = await import("@/app/actions/operations")
    await updateTableState({ id: "t1", x: 3, y: 1 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ x: 3, y: 1 }))
    await updateTableState({ id: "t1", x: 99, y: -4 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ x: 11, y: 0 }))
  })
})

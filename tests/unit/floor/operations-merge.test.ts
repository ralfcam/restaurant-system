import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  insertMerge: vi.fn(),
  insertMembers: vi.fn(),
  insertEvent: vi.fn(),
  tables: [] as Array<Record<string, unknown>>,
  members: [] as Array<{ merge_id: string; table_id: string }>,
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
      if (name === "tables") {
        return {
          select: () => ({
            in: async (column: string, ids: string[]) => ({
              data: mocks.tables.filter((row) => ids.includes(String(row[column] ?? row.id))),
              error: null,
            }),
            eq: () => ({
              maybeSingle: async () => ({ data: mocks.tables[0] ?? null, error: null }),
              single: async () => ({ data: mocks.tables[0] ?? null, error: mocks.tables[0] ? null : { message: "missing" } }),
            }),
            order: async () => ({ data: mocks.tables, error: null }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (name === "table_merges") {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => mocks.insertMerge(row),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
          delete: () => ({ eq: async () => ({ error: null }) }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "merge-1", expected_minutes: 120, expires_at: "2026-08-18T19:30:00.000Z", status: "available" }, error: null }),
            }),
          }),
        }
      }
      if (name === "table_merge_members") {
        return {
          select: () => ({
            in: async () => ({ data: mocks.members, error: null }),
            eq: (column: string, value: string) => {
              const data = mocks.members.filter(
                (row) => String(row[column as keyof typeof row]) === value,
              )
              return {
                then: (resolve: (value: unknown) => unknown) =>
                  Promise.resolve({ data, error: null }).then(resolve),
                maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
              }
            },
          }),
          insert: async (rows: unknown) => mocks.insertMembers(rows),
        }
      }
      return {
        insert: async (row: unknown) => mocks.insertEvent(row),
      }
    },
  }),
}))

describe("mergeTables", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.insertMerge.mockReset()
    mocks.insertMembers.mockReset()
    mocks.insertEvent.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.tables = [
      { id: "t3", label: "3", seats: 2, status: "available", expected_minutes: 90, x: 0, y: 0 },
      { id: "t4", label: "4", seats: 4, status: "available", expected_minutes: 120, x: 1, y: 0 },
    ]
    mocks.members = []
    mocks.insertMerge.mockImplementation((row: Record<string, unknown>) => ({
      data: { id: "merge-1", ...row },
      error: null,
    }))
    mocks.insertMembers.mockImplementation(async (rows: Array<{ merge_id: string; table_id: string }>) => {
      if (Array.isArray(rows)) mocks.members.push(...rows)
      return { error: null }
    })
    mocks.insertEvent.mockResolvedValue({ error: null })
  })

  it("creates an arrangement that adds seats and lasts the longest expected time", async () => {
    const { mergeTables } = await import("@/app/actions/operations")
    const merge = await mergeTables({ tableIds: ["t3", "t4"] })
    expect(merge).toMatchObject({
      id: "merge-1",
      label: "3+4",
      seats: 6,
      expectedMinutes: 120,
    })
    expect(mocks.insertMerge).toHaveBeenCalledWith(
      expect.objectContaining({ expected_minutes: 120, status: "available" }),
    )
    expect(mocks.insertMembers).toHaveBeenCalledWith([
      { merge_id: "merge-1", table_id: "t3" },
      { merge_id: "merge-1", table_id: "t4" },
    ])
  })

  it("rejects reserved tables", async () => {
    mocks.tables[1]!.status = "reserved"
    const { mergeTables } = await import("@/app/actions/operations")
    await expect(mergeTables({ tableIds: ["t3", "t4"] })).rejects.toThrow(
      "Only available tables can be merged.",
    )
  })

  it("adds an available table to an existing available arrangement", async () => {
    mocks.tables.push({
      id: "t5",
      label: "5",
      seats: 4,
      status: "available",
      expected_minutes: 90,
      x: 2,
      y: 0,
    })
    mocks.members = [
      { merge_id: "merge-1", table_id: "t3" },
      { merge_id: "merge-1", table_id: "t4" },
    ]
    const { mergeTables } = await import("@/app/actions/operations")
    const merge = await mergeTables({ tableIds: ["t3", "t5"] })
    expect(merge).toMatchObject({
      id: "merge-1",
      label: "3+4+5",
      seats: 10,
    })
    expect(mocks.insertMembers).toHaveBeenCalledWith([
      { merge_id: "merge-1", table_id: "t5" },
    ])
  })
})

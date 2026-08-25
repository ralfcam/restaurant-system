import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      upsert: mocks.upsert,
    }),
  }),
}))

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("restaurant-wide slot interval on the floor plan", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.upsert.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it("floor plan exposes and persists restaurant-wide slot interval", async () => {
    const floor = read("components/staff/floor-plan.tsx")
    const inspectorStart = floor.indexOf("{selected ?")

    expect(floor.slice(0, inspectorStart)).toMatch(
      /data-testid=["']slot-interval-control["']/,
    )
    expect(floor.slice(inspectorStart)).not.toMatch(
      /data-testid=["']slot-interval-control["']/,
    )
    expect(floor).toMatch(/updateSlotIntervalMinutes/)
    expect(floor).toMatch(/@\/app\/actions\/branding/)

    const { updateSlotIntervalMinutes } = await import("@/app/actions/branding")
    await updateSlotIntervalMinutes(15)
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, slot_interval_minutes: 15 }),
    )
  })
})

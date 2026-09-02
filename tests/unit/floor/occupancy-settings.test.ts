import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  requireSuperAdminUser: vi.fn(),
  revalidatePath: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
  requireSuperAdminUser: mocks.requireSuperAdminUser,
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

function controlChrome(source: string, testId: string) {
  const match = source.match(
    new RegExp(`data-testid=["']${testId}["'][\\s\\S]{0,400}`),
  )
  return match?.[0] ?? ""
}

describe("restaurant-wide occupancy duration and safety buffer on the floor plan", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireSuperAdminUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.upsert.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.requireSuperAdminUser.mockResolvedValue({ id: "super-admin-1" })
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it("floor plan exposes and persists occupancy duration and safety buffer (default 15)", async () => {
    const floor = read("components/staff/floor-plan.tsx")
    const inspectorStart = floor.indexOf("{selected ?")
    const chrome = floor.slice(0, inspectorStart)
    const inspector = floor.slice(inspectorStart)

    expect(chrome).toMatch(/data-testid=["']occupancy-duration-control["']/)
    expect(chrome).toMatch(/data-testid=["']safety-buffer-control["']/)
    expect(inspector).not.toMatch(
      /data-testid=["']occupancy-duration-control["']/,
    )
    expect(inspector).not.toMatch(/data-testid=["']safety-buffer-control["']/)

    const occupancyChrome = controlChrome(chrome, "occupancy-duration-control")
    expect(occupancyChrome).toMatch(/role=["']group["']/)
    expect(occupancyChrome).toMatch(/aria-labelledby=/)
    expect(chrome).toMatch(/Occupancy duration/)

    const bufferChrome = controlChrome(chrome, "safety-buffer-control")
    expect(bufferChrome).toMatch(/role=["']group["']/)
    expect(bufferChrome).toMatch(/aria-labelledby=/)
    expect(chrome).toMatch(/Safety buffer/)

    expect(floor).toMatch(/updateOccupancyDurationMinutes/)
    expect(floor).toMatch(/updateSafetyBufferMinutes/)
    expect(floor).toMatch(/@\/app\/actions\/branding/)
    expect(floor).toMatch(/initialSafetyBuffer/)
    expect(floor).toMatch(/initialOccupancyDuration/)

    const page = read("app/admin/floor/page.tsx")
    expect(page).toMatch(/getOccupancyDurationMinutes/)
    expect(page).toMatch(/getSafetyBufferMinutes/)

    const {
      getSafetyBufferMinutes,
      updateOccupancyDurationMinutes,
      updateSafetyBufferMinutes,
    } = await import("@/app/actions/branding")

    expect(await getSafetyBufferMinutes()).toBe(15)

    await updateSafetyBufferMinutes(30)
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, safety_buffer_minutes: 30 }),
    )

    await updateOccupancyDurationMinutes(30)
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, occupancy_duration_minutes: 30 }),
    )
  })

  it("rejects staff-only callers for occupancy duration", async () => {
    mocks.requireSuperAdminUser.mockResolvedValue(null)
    const { updateOccupancyDurationMinutes } =
      await import("@/app/actions/branding")
    await expect(updateOccupancyDurationMinutes(30)).rejects.toThrow(
      "Unauthorized",
    )
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("rejects staff-only callers for safety buffer", async () => {
    mocks.requireSuperAdminUser.mockResolvedValue(null)
    const { updateSafetyBufferMinutes } = await import("@/app/actions/branding")
    await expect(updateSafetyBufferMinutes(30)).rejects.toThrow("Unauthorized")
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})

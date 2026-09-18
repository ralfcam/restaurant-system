import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import type { TableStatus } from "@/lib/data"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  getAuthUser: vi.fn(),
  getFloorSnapshot: vi.fn(),
  getAvailableSlots: vi.fn(),
  getConfiguredOperatingWindows: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/app/actions/auth", () => ({
  getAuthUser: mocks.getAuthUser,
}))

vi.mock("@/app/actions/reservations", () => ({
  getAvailableSlots: mocks.getAvailableSlots,
  getFloorSnapshot: mocks.getFloorSnapshot,
}))

vi.mock("@/app/actions/availability", () => ({
  getConfiguredOperatingWindows: mocks.getConfiguredOperatingWindows,
}))

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function resolveImport(fromDir: string, spec: string): string | null {
  const rel = spec.startsWith("@/")
    ? spec.slice(2)
    : path.posix.normalize(path.posix.join(fromDir, spec))
  for (const candidate of [rel, `${rel}.tsx`, `${rel}.ts`]) {
    const abs = path.join(root, candidate)
    if (existsSync(abs)) return abs
  }
  return null
}

function weeklyOverviewChrome(page: string): string {
  const weeklyImports = [...page.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((spec) => /week|overview/i.test(spec))
    .map((spec) => resolveImport("app/admin", spec))
    .filter((abs): abs is string => abs != null)
    .map((abs) => readFileSync(abs, "utf8"))

  return [page, ...weeklyImports].join("\n")
}

function overviewSurface(chrome: string): string {
  const at = chrome.search(/data-testid=["']week-overview["']/)
  expect(at).toBeGreaterThan(-1)
  const from = chrome.lastIndexOf("<", at)
  return chrome.slice(from === -1 ? at : from)
}

const SELECTED_DATE = "2026-09-16"

// Anti-seed occupancy: TABLES seed is 3 seated / 10 total / 4 available.
const TONIGHT_SNAPSHOT = {
  tables: [
    ...Array.from({ length: 7 }, (): { status: TableStatus } => ({
      status: "seated",
    })),
    { status: "reserved" as TableStatus },
    { status: "cleaning" as TableStatus },
  ],
  reservations: [
    {
      id: "r-ada",
      guest_name: "Ada Lovelace",
      party_size: 4,
      date: SELECTED_DATE,
      time: "19:00",
      status: "confirmed" as const,
      phone: "555-0100",
      notes: null,
      table_label: "1",
      conf_code: "TVL-1001",
      created_at: "2026-09-16T10:00:00.000Z",
    },
  ],
  assigned: [],
  merges: [],
}

function collectByType(
  node: unknown,
  type: unknown,
  found: Array<{ props: Record<string, unknown> }> = [],
) {
  if (node == null || typeof node !== "object") return found
  if (Array.isArray(node)) {
    for (const child of node) collectByType(child, type, found)
    return found
  }
  const el = node as { type?: unknown; props?: Record<string, unknown> }
  if (el.type === type && el.props) found.push({ props: el.props })
  if (el.props) {
    for (const value of Object.values(el.props))
      collectByType(value, type, found)
  }
  return found
}

function collectStrings(node: unknown, found: string[] = []): string[] {
  if (typeof node === "string") {
    found.push(node)
    return found
  }
  if (node == null || typeof node !== "object") return found
  if (Array.isArray(node)) {
    for (const child of node) collectStrings(child, found)
    return found
  }
  const el = node as { props?: Record<string, unknown> }
  if (el.props) {
    for (const value of Object.values(el.props)) collectStrings(value, found)
  }
  return found
}

describe("dashboard weekly service overview chrome", () => {
  it("admin Dashboard renders weekly service overview with week navigation", () => {
    const page = read("app/admin/page.tsx")
    expect(page).toMatch(
      /WeeklyServiceOverview|weekly-service-overview|data-testid=["']week-overview["']/,
    )

    const surface = overviewSurface(weeklyOverviewChrome(page))
    expect(surface).toMatch(/data-testid=["']week-overview["']/)
    expect(surface).toMatch(/data-testid=["']prev-week["']/)
    expect(surface).toMatch(/data-testid=["']next-week["']/)

    expect(surface).toMatch(/days\.map\(/)
    expect(surface).toMatch(/service\.label/)

    expect(surface).toMatch(/\bavailable\b/i)
    expect(surface).toMatch(/fully booked/i)
    expect(surface).toMatch(/\bgreen\b/i)
    expect(surface).toMatch(/\bred\b/i)
  })

  it("weekly overview rejection still settles tonight's floor snapshot", async () => {
    mocks.requireStaffUser.mockReset()
    mocks.getAuthUser.mockReset()
    mocks.getFloorSnapshot.mockReset()
    mocks.getAvailableSlots.mockReset()
    mocks.getConfiguredOperatingWindows.mockReset()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.getAuthUser.mockResolvedValue({ email: "host@example.com" })
    mocks.getFloorSnapshot.mockResolvedValue(TONIGHT_SNAPSHOT)
    mocks.getConfiguredOperatingWindows.mockResolvedValue([])
    mocks.getAvailableSlots.mockRejectedValue(
      new Error("weekly slots unavailable"),
    )

    const [
      { default: AdminDashboardPage },
      { WeeklyServiceOverview },
      { StatCard },
    ] = await Promise.all([
      import("@/app/admin/page"),
      import("@/components/staff/weekly-service-overview"),
      import("@/components/staff/stat-card"),
    ])

    const tree = await AdminDashboardPage({
      searchParams: Promise.resolve({ week: SELECTED_DATE }),
    })

    expect(mocks.getFloorSnapshot).toHaveBeenCalled()
    expect(mocks.getAvailableSlots).toHaveBeenCalled()

    const weekly = collectByType(tree, WeeklyServiceOverview)
    expect(weekly).toHaveLength(1)
    expect(weekly[0]?.props.days).toEqual([])

    const cards = collectByType(tree, StatCard)
    expect(
      cards.find((card) => card.props.label === "Bookings tonight")?.props
        .value,
    ).toBe(1)
    expect(
      cards.find((card) => card.props.label === "Floor occupancy")?.props.value,
    ).toBe("7/9")
    expect(collectStrings(tree)).toContain("Ada Lovelace")
  })

  it("weekly overview does not load DEFAULT operating-day templates", () => {
    const page = read("app/admin/page.tsx")
    const loaderStart = page.indexOf("async function loadWeeklyServiceOverview")
    expect(loaderStart).toBeGreaterThan(-1)
    const pageFnStart = page.indexOf(
      "export default async function AdminDashboardPage",
    )
    const loader = page.slice(
      loaderStart,
      pageFnStart === -1 ? undefined : pageFnStart,
    )

    expect(loader).not.toMatch(/\bgetAllOperatingWindowsMap\b/)
    expect(page).not.toMatch(/\bgetAllOperatingWindowsMap\b/)
    expect(loader).not.toMatch(/\bDEFAULT_OPERATING_DAYS\b/)
    expect(page).not.toMatch(/\bDEFAULT_OPERATING_DAYS\b/)
  })
})

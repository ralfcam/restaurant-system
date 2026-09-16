import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

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

  it("weekly overview load is isolated from tonight's floor snapshot", () => {
    const page = read("app/admin/page.tsx")
    const pageFnStart = page.indexOf(
      "export default async function AdminDashboardPage",
    )
    expect(pageFnStart).toBeGreaterThan(-1)
    const pageFn = page.slice(pageFnStart)

    const unguardedWeeklyAfterSnapshot =
      /Promise\.all\(\[[^\]]*getFloorSnapshot[^\]]*loadWeeklyServiceOverview\s*\([^)]*\)\s*,?\s*\]/
    const unguardedWeeklyBeforeSnapshot =
      /Promise\.all\(\[[^\]]*loadWeeklyServiceOverview\s*\([^)]*\)\s*,[^\]]*getFloorSnapshot[^\]]*\]/

    expect(pageFn).not.toMatch(unguardedWeeklyAfterSnapshot)
    expect(pageFn).not.toMatch(unguardedWeeklyBeforeSnapshot)
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

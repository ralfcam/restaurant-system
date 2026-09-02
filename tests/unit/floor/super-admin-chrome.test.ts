import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

/**
 * Region from the last `<div` before `idAttr` through `nextBound`.
 * Not truncated at the first `>` (so `onClick={() =>` cannot hide `disabled`).
 */
function controlRegion(source: string, idAttr: string, nextBound: string) {
  const at = source.indexOf(idAttr)
  expect(at).toBeGreaterThan(-1)
  const from = source.lastIndexOf("<div", at)
  expect(from).toBeGreaterThan(-1)
  const end = source.indexOf(nextBound, at)
  expect(end).toBeGreaterThan(-1)
  return source.slice(from, end)
}

function minutesStepperHelper(source: string) {
  const from = source.indexOf("function MinutesStepperButtons")
  expect(from).toBeGreaterThan(-1)
  const end = source.indexOf("export function FloorPlan")
  expect(end).toBeGreaterThan(from)
  return source.slice(from, end)
}

const gatedDisabled =
  /disabled=\{[^}]*(?:!isSuperAdmin|isSuperAdmin\s*===\s*false)/

function expectStepperGroupGated(floor: string, region: string) {
  expect(region).toMatch(/<MinutesStepperButtons\b/)
  const onCall = gatedDisabled.test(region)
  const inHelper = gatedDisabled.test(minutesStepperHelper(floor))
  expect(onCall || inHelper).toBe(true)
}

describe("SA-10 floor booking-config chrome", () => {
  it("occupancy duration and safety buffer controls disable for staff-only sessions", () => {
    const floor = read("components/staff/floor-plan.tsx")
    const page = read("app/admin/floor/page.tsx")

    expect(floor).toMatch(
      /function\s+FloorPlan\s*\(\s*\{[\s\S]*?\bisSuperAdmin\b/,
    )

    expectStepperGroupGated(
      floor,
      controlRegion(
        floor,
        'data-testid="occupancy-duration-control"',
        'data-testid="safety-buffer-control"',
      ),
    )
    expectStepperGroupGated(
      floor,
      controlRegion(floor, 'data-testid="safety-buffer-control"', "Lock all"),
    )

    expect(page).toMatch(
      /<FloorPlan[\s\S]*?\bisSuperAdmin=\{isSuperAdminUser\(authUser\)\}/,
    )
  })
})

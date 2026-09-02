import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

/**
 * Region from the last `<tag` before `idAttr` through `nextBound`.
 * Not truncated at the first `>` (so `onChange={() =>` cannot hide `disabled`).
 */
function controlRegion(source: string, idAttr: string, nextBound: string) {
  const at = source.indexOf(idAttr)
  expect(at).toBeGreaterThan(-1)
  const from = source.lastIndexOf("<Input", at)
  expect(from).toBeGreaterThan(-1)
  const end = source.indexOf(nextBound, at)
  expect(end).toBeGreaterThan(-1)
  return source.slice(from, end)
}

function lastTagRegionBefore(source: string, needle: string, tag: string) {
  const at = source.indexOf(needle)
  expect(at).toBeGreaterThan(-1)
  const from = source.lastIndexOf(`<${tag}`, at)
  expect(from).toBeGreaterThan(-1)
  return source.slice(from, at)
}

const gatedDisabled =
  /disabled=\{[^}]*(?:!isSuperAdmin|isSuperAdmin\s*===\s*false)/

describe("SA-10 scheduling contact-info chrome", () => {
  it("restaurant contact-info fields disable for staff-only sessions", () => {
    const manager = read("components/staff/scheduling-manager.tsx")
    const page = read("app/admin/scheduling/page.tsx")

    expect(manager).toMatch(
      /function\s+SchedulingManager\s*\(\s*\{[\s\S]*?\bisSuperAdmin\b/,
    )

    expect(
      controlRegion(
        manager,
        'id="restaurant-address"',
        'id="restaurant-phone"',
      ),
    ).toMatch(gatedDisabled)
    expect(controlRegion(manager, 'id="restaurant-phone"', "<Button")).toMatch(
      gatedDisabled,
    )
    expect(lastTagRegionBefore(manager, "Save contact info", "Button")).toMatch(
      gatedDisabled,
    )

    expect(page).toMatch(
      /<SchedulingManager[\s\S]*?\bisSuperAdmin=\{isSuperAdminUser\(authUser\)\}/,
    )
  })
})

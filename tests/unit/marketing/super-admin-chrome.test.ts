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
function controlRegion(
  source: string,
  tag: string,
  idAttr: string,
  nextBound: string,
) {
  const at = source.indexOf(idAttr)
  expect(at).toBeGreaterThan(-1)
  const from = source.lastIndexOf(`<${tag}`, at)
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

describe("SA-10 review-email settings chrome", () => {
  it("review email settings form disables for staff-only sessions", () => {
    const form = read("app/admin/marketing/review-email-settings-form.tsx")
    const page = read("app/admin/marketing/page.tsx")

    expect(form).toMatch(
      /function\s+ReviewEmailSettingsForm\s*\(\s*\{[\s\S]*?\bisSuperAdmin\b/,
    )

    expect(
      controlRegion(
        form,
        "Switch",
        'data-testid="review-email-enabled-control"',
        'data-testid="review-email-copy-control"',
      ),
    ).toMatch(gatedDisabled)
    expect(
      controlRegion(
        form,
        "Textarea",
        'data-testid="review-email-copy-control"',
        'data-testid="review-email-maps-url-control"',
      ),
    ).toMatch(gatedDisabled)
    expect(
      controlRegion(
        form,
        "Input",
        'data-testid="review-email-maps-url-control"',
        'data-testid="review-email-delay-control"',
      ),
    ).toMatch(gatedDisabled)
    expect(
      controlRegion(
        form,
        "Input",
        'data-testid="review-email-delay-control"',
        "<Button",
      ),
    ).toMatch(gatedDisabled)
    expect(lastTagRegionBefore(form, "Save", "Button")).toMatch(gatedDisabled)

    expect(page).toMatch(
      /<ReviewEmailSettingsForm[\s\S]*?\bisSuperAdmin=\{isSuperAdminUser\(authUser\)\}/,
    )
  })
})

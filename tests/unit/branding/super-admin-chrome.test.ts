import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

/** First JSX opening tag starting at `from` (attributes may span lines). */
function openingTag(source: string, from: number) {
  const slice = source.slice(from)
  const end = slice.search(/>/)
  expect(end).toBeGreaterThan(-1)
  return slice.slice(0, end + 1)
}

function lastOpenTagBefore(source: string, needle: string, tag: string) {
  const at = source.indexOf(needle)
  expect(at).toBeGreaterThan(-1)
  const from = source.lastIndexOf(`<${tag}`, at)
  expect(from).toBeGreaterThan(-1)
  return openingTag(source, from)
}

function expectEditorGatesMutations(source: string, fileInputId: string) {
  expect(source).toMatch(
    /function\s+Restaurant(?:Logo|HeroImage)Editor\s*\(\s*\{[\s\S]*?\bisSuperAdmin\b/,
  )

  const gatedDisabled =
    /disabled=\{[^}]*(?:!isSuperAdmin|isSuperAdmin\s*===\s*false)/

  expect(lastOpenTagBefore(source, fileInputId, "input")).toMatch(gatedDisabled)
  expect(lastOpenTagBefore(source, "Choose an image", "Button")).toMatch(
    gatedDisabled,
  )
  expect(lastOpenTagBefore(source, "Remove ", "Button")).toMatch(gatedDisabled)
  expect(lastOpenTagBefore(source, "Save ", "Button")).toMatch(gatedDisabled)
}

describe("SA-10 branding editor chrome", () => {
  it("logo and hero editors disable mutation controls for staff-only sessions", () => {
    const logo = read("components/staff/restaurant-logo-editor.tsx")
    const hero = read("components/staff/restaurant-hero-image-editor.tsx")
    const page = read("app/admin/settings/page.tsx")

    expectEditorGatesMutations(logo, "logo-upload-input")
    expectEditorGatesMutations(hero, "hero-image-upload-input")

    expect(page).toMatch(
      /import\s*\{[^}]*\bisSuperAdminUser\b[^}]*\}\s*from\s*["']@\/lib\/supabase\/is-staff-user["']/,
    )
    expect(page).toMatch(
      /<RestaurantLogoEditor[\s\S]*?\bisSuperAdmin=\{isSuperAdminUser\(authUser\)\}/,
    )
    expect(page).toMatch(
      /<RestaurantHeroImageEditor[\s\S]*?\bisSuperAdmin=\{isSuperAdminUser\(authUser\)\}/,
    )
  })
})

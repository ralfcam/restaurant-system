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

function needleAt(source: string, needle: string | RegExp) {
  if (typeof needle === "string") return source.indexOf(needle)
  const match = new RegExp(needle.source, needle.flags).exec(source)
  return match?.index ?? -1
}

function lastOpenTagBefore(
  source: string,
  needle: string | RegExp,
  tag: string,
) {
  const at = needleAt(source, needle)
  expect(at).toBeGreaterThan(-1)
  const from = source.lastIndexOf(`<${tag}`, at)
  expect(from).toBeGreaterThan(-1)
  return openingTag(source, from)
}

/**
 * First match is either a JSX comment that holds `phrase` and
 * `t("staff.branding.` (either order), or `t("staff.branding.<leaf>")`
 * whose leaf contains `leafFragment` (`choose` / `remove` / `save`).
 * `remove` and `save` reject a following `d` so `removed` / `saved` toasts
 * are not the button.
 */
function brandingButtonNeedle(phrases: string[], leafFragment: string) {
  const escaped = phrases
    .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  const call = String.raw`t\(\s*"staff\.branding\.`
  const atom = String.raw`(?:(?!\*\/)[\s\S])`
  const comment = String.raw`\{\/\*${atom}*(?:(?:${escaped})${atom}*${call}|${call}${atom}*(?:${escaped}))${atom}*\*\/\}`
  return new RegExp(`${comment}|${call}[^"]*${leafFragment}`)
}

function expectEditorGatesMutations(source: string, fileInputId: string) {
  expect(source).toMatch(
    /function\s+Restaurant(?:Logo|HeroImage)Editor\s*\(\s*\{[\s\S]*?\bisSuperAdmin\b/,
  )

  const gatedDisabled =
    /disabled=\{[^}]*(?:!isSuperAdmin|isSuperAdmin\s*===\s*false)/

  expect(lastOpenTagBefore(source, fileInputId, "input")).toMatch(gatedDisabled)
  expect(
    lastOpenTagBefore(
      source,
      brandingButtonNeedle(["Choose an image"], "choose"),
      "Button",
    ),
  ).toMatch(gatedDisabled)
  expect(
    lastOpenTagBefore(
      source,
      brandingButtonNeedle(["Remove logo", "Remove hero image"], "remove(?!d)"),
      "Button",
    ),
  ).toMatch(gatedDisabled)
  expect(
    lastOpenTagBefore(
      source,
      brandingButtonNeedle(["Save logo", "Save hero image"], "save(?!d)"),
      "Button",
    ),
  ).toMatch(gatedDisabled)
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

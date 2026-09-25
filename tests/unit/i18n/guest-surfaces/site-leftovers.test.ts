import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  extractTranslationKeys,
  findHardCodedCopy,
  importsNextIntl,
  unresolvedCatalogKeys,
} from "../helpers/copy-scan"

const SURFACE_FILES = [
  "components/site/home-page-client.tsx",
  "app/[locale]/menu/page.tsx",
  "lib/site-chrome.ts",
  "hooks/use-restaurant-info-bar.ts",
  "app/layout.tsx",
  "app/[locale]/layout.tsx",
  "app/admin/layout.tsx",
  "app/auth/layout.tsx",
  "app/pos/layout.tsx",
  "app/kds/layout.tsx",
] as const

/** Layouts whose metadata the copy scan cannot see (no title/description strings). */
const METADATA_LAYOUTS = [
  "app/[locale]/layout.tsx",
  "app/admin/layout.tsx",
  "app/auth/layout.tsx",
  "app/pos/layout.tsx",
  "app/kds/layout.tsx",
] as const

const LOGO_ALT = "`${RESTAURANT.name} logo`"
const TAGLINE = "Reservations, menu, and service — one platform"
const HOURS_FALLBACK = "Mon–Sat · 11:00–22:00"

/** Source of `function name` through its closing brace. */
function functionSource(source: string, name: string): string {
  const start = source.search(new RegExp(`\\bfunction\\s+${name}\\b`))
  if (start < 0) return ""
  const open = source.indexOf("{", start)
  if (open < 0) return ""
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++
    else if (source[i] === "}") {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return ""
}

function hasCatalogBackedMetadata(source: string): boolean {
  const metadataFn = functionSource(source, "generateMetadata")
  return (
    metadataFn.includes("getTranslations") &&
    /\btitle\s*:/.test(metadataFn) &&
    /\bdescription\s*:/.test(metadataFn)
  )
}

/** Bare `t("badge")` keys sit in JSX `{…}` and the scanner reports them as copy. */
function isTranslatorArgument(source: string, text: string): boolean {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(
    `\\b(?:useTranslations|getTranslations|[A-Za-z_$][\\w$]*)\\(\\s*["']${escaped}["']`,
  ).test(source)
}

describe("guest leftovers and localized metadata", () => {
  it("renders image alts, logo alt, tagline, hours fallback, and layout metadata from next-intl catalogs with no hard-coded system copy", () => {
    const problems: string[] = []

    for (const rel of SURFACE_FILES) {
      const source = readFileSync(path.join(process.cwd(), rel), "utf8")
      if (!importsNextIntl(source)) {
        problems.push(
          `${rel}: missing next-intl useTranslations or getTranslations import`,
        )
      }
      for (const hit of findHardCodedCopy(source)) {
        if (isTranslatorArgument(source, hit.text)) continue
        problems.push(
          `${rel}:${hit.line} ${hit.kind} ${JSON.stringify(hit.text)}`,
        )
      }
      for (const key of unresolvedCatalogKeys(extractTranslationKeys(source))) {
        problems.push(`${rel}: unresolved catalog key ${key}`)
      }
      if (rel.endsWith("site-chrome.ts") && source.includes(LOGO_ALT)) {
        problems.push(
          `${rel}: SITE_LOGO.alt contains ${JSON.stringify(LOGO_ALT)}`,
        )
      }
      if (
        rel.endsWith("use-restaurant-info-bar.ts") &&
        source.includes("hours: RESTAURANT.hours")
      ) {
        problems.push(`${rel}: hours fallback is RESTAURANT.hours`)
      }
      if (
        (METADATA_LAYOUTS as readonly string[]).includes(rel) &&
        !hasCatalogBackedMetadata(source)
      ) {
        problems.push(
          `${rel}: missing catalog-backed generateMetadata (getTranslations for title and description)`,
        )
      }
    }

    const dataSource = readFileSync(
      path.join(process.cwd(), "lib/data.ts"),
      "utf8",
    )
    if (dataSource.includes(TAGLINE)) {
      problems.push(
        `lib/data.ts: RESTAURANT.tagline is hard-coded ${JSON.stringify(TAGLINE)}`,
      )
    }
    if (dataSource.includes(HOURS_FALLBACK)) {
      problems.push(
        `lib/data.ts: RESTAURANT.hours fallback is hard-coded ${JSON.stringify(HOURS_FALLBACK)}`,
      )
    }

    expect(problems).toEqual([])
  })
})

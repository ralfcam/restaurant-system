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
  "app/admin/floor/page.tsx",
  "components/staff/floor-plan.tsx",
  "lib/floor/table-use.ts",
] as const

const DURATION_UNIT_TEMPLATES = [
  "${n} min",
  "${hours}h",
  "${hours}h ${rest}m",
] as const

/** Source of `function name` through its closing brace, including template `${}`. */
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

describe("floor plan surface catalogs", () => {
  it("renders floor page, floor plan, and formatDurationMinutes unit labels from next-intl catalogs with no hard-coded system copy", () => {
    const problems: string[] = []

    for (const rel of SURFACE_FILES) {
      const source = readFileSync(path.join(process.cwd(), rel), "utf8")
      if (!importsNextIntl(source)) {
        problems.push(
          `${rel}: missing next-intl useTranslations or getTranslations import`,
        )
      }
      for (const hit of findHardCodedCopy(source)) {
        problems.push(
          `${rel}:${hit.line} ${hit.kind} ${JSON.stringify(hit.text)}`,
        )
      }
      for (const key of unresolvedCatalogKeys(extractTranslationKeys(source))) {
        problems.push(`${rel}: unresolved catalog key ${key}`)
      }
      if (rel.endsWith("table-use.ts")) {
        const durationFn = functionSource(source, "formatDurationMinutes")
        if (!durationFn) {
          problems.push(`${rel}: formatDurationMinutes source not found`)
        }
        for (const unit of DURATION_UNIT_TEMPLATES) {
          if (durationFn.includes(unit)) {
            problems.push(
              `${rel}: formatDurationMinutes contains ${JSON.stringify(unit)}`,
            )
          }
        }
      }
    }

    expect(problems).toEqual([])
  })
})

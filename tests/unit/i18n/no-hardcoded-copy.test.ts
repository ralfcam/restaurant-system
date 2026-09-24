import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { findHardCodedCopy } from "./helpers/copy-scan"

const SCAN_ROOTS = [
  "app/admin",
  "app/auth",
  "app/pos",
  "app/kds",
  "app/[locale]",
  "components/staff",
  "components/site",
] as const

/**
 * Leaves that are identical in French and English because the spelling is the
 * same (loanword or cognate) or the leaf is only an ICU placeholder.
 */
const NEUTRAL_CATALOG_KEYS = [
  "nav.menu",
  "menuBrowser.signature",
  "reservationWidget.date",
  "reservationWidget.dateSummary",
  "reservationWidget.timeSummary",
  "staff.floor.tableAssigned",
  "staff.floor.tableHeading",
  "staff.floor.tablesHeading",
  "staff.reservations.columnTable",
] as const

function walkTsFiles(relDir: string): string[] {
  const abs = path.join(process.cwd(), relDir)
  if (!existsSync(abs)) return []
  const files: string[] = []
  for (const entry of readdirSync(abs)) {
    const rel = `${relDir}/${entry}`.replaceAll("\\", "/")
    const absEntry = path.join(abs, entry)
    if (statSync(absEntry).isDirectory()) {
      files.push(...walkTsFiles(rel))
      continue
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) files.push(rel)
  }
  return files
}

function stringLeaves(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") {
    return prefix ? { [prefix]: value } : {}
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, nested]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      return { ...acc, ...stringLeaves(nested, nextPrefix) }
    },
    {} as Record<string, string>,
  )
}

describe("global hard-coded copy sweep", () => {
  it("finds no hard-coded system copy under staff and guest surfaces", () => {
    const files = SCAN_ROOTS.flatMap((root) => walkTsFiles(root))
    expect(files.length).toBeGreaterThan(0)

    const problems: string[] = []
    for (const rel of files) {
      const source = readFileSync(path.join(process.cwd(), rel), "utf8")
      for (const hit of findHardCodedCopy(source)) {
        problems.push(
          `${rel}:${hit.line} ${hit.kind} ${JSON.stringify(hit.text)}`,
        )
      }
    }

    expect(problems).toEqual([])
  })

  it("keeps every French catalog leaf different from English except listed neutrals", () => {
    const frLeaves = stringLeaves(fr)
    const enLeaves = stringLeaves(en)
    const neutral = new Set<string>(NEUTRAL_CATALOG_KEYS)
    const same: string[] = []

    for (const key of Object.keys(enLeaves).sort()) {
      if (neutral.has(key)) continue
      if (frLeaves[key] === enLeaves[key]) {
        same.push(`${key} = ${JSON.stringify(enLeaves[key])}`)
      }
    }

    expect(same).toEqual([])
  })
})

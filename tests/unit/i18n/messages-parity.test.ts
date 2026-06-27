import { describe, expect, it } from "vitest"
import fr from "@/messages/fr.json"
import en from "@/messages/en.json"

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) => flattenKeys(nested, prefix ? `${prefix}.${key}` : key),
  )
}

function leafValues(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") {
    return prefix ? { [prefix]: value } : {}
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, nested]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      return { ...acc, ...leafValues(nested, nextPrefix) }
    },
    {} as Record<string, string>,
  )
}

describe("message catalogs", () => {
  it("fr and en catalogs have identical non-empty key sets", () => {
    const frKeys = flattenKeys(fr).sort()
    const enKeys = flattenKeys(en).sort()

    expect(frKeys).toEqual(enKeys)

    const frLeaves = leafValues(fr)
    const enLeaves = leafValues(en)

    for (const key of frKeys) {
      expect(frLeaves[key]?.trim().length).toBeGreaterThan(0)
      expect(enLeaves[key]?.trim().length).toBeGreaterThan(0)
    }
  })
})

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

const RESERVATION_WIDGET_CHROME_KEYS = [
  "reservationWidget.reserve",
  "reservationWidget.until",
  "reservationWidget.guests",
  "reservationWidget.date",
  "reservationWidget.time",
  "reservationWidget.guestsSummary",
  "reservationWidget.dateSummary",
  "reservationWidget.timeSummary",
] as const

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

  it("reservationWidget chrome keys exist in both catalogs", () => {
    const frKeys = new Set(flattenKeys(fr))
    const enKeys = new Set(flattenKeys(en))
    const frLeaves = leafValues(fr)
    const enLeaves = leafValues(en)

    for (const key of RESERVATION_WIDGET_CHROME_KEYS) {
      expect(frKeys.has(key)).toBe(true)
      expect(enKeys.has(key)).toBe(true)
      expect(frLeaves[key]?.trim().length).toBeGreaterThan(0)
      expect(enLeaves[key]?.trim().length).toBeGreaterThan(0)
    }
  })
})

import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import fr from "@/messages/fr.json"
import en from "@/messages/en.json"

const reservationWidgetPath = path.join(
  process.cwd(),
  "components",
  "site",
  "reservation-widget.tsx",
)

function readReservationWidgetSource() {
  return readFileSync(reservationWidgetPath, "utf8")
}

const CHROME_LEAF_KEYS = [
  "reserve",
  "until",
  "guests",
  "date",
  "time",
  "guestsSummary",
  "dateSummary",
  "timeSummary",
] as const

function reservationWidgetLeaves(catalog: unknown): Record<string, string> {
  const root = catalog as Record<string, unknown>
  const namespace = root.reservationWidget
  if (
    namespace === null ||
    typeof namespace !== "object" ||
    Array.isArray(namespace)
  ) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(namespace as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
}

describe("reservation widget chrome i18n", () => {
  it("widget chrome keys exist in fr and en and the widget uses useTranslations", () => {
    const frLeaves = reservationWidgetLeaves(fr)
    const enLeaves = reservationWidgetLeaves(en)

    for (const key of CHROME_LEAF_KEYS) {
      expect(frLeaves).toHaveProperty(key)
      expect(enLeaves).toHaveProperty(key)
      expect(frLeaves[key].trim().length).toBeGreaterThan(0)
      expect(enLeaves[key].trim().length).toBeGreaterThan(0)
    }

    const source = readReservationWidgetSource()
    expect(source).toMatch(/from\s+["']next-intl["']/)
    expect(source).toMatch(/useTranslations\(\s*["']reservationWidget["']\s*\)/)
  })
})

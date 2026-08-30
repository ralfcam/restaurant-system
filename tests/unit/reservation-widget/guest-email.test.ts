import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const reservationWidgetPath = path.join(
  process.cwd(),
  "components",
  "site",
  "reservation-widget.tsx",
)

function readReservationWidgetSource() {
  return readFileSync(reservationWidgetPath, "utf8")
}

describe("reservation widget guest email intake", () => {
  it("confirm passes email and Email is required while Phone is not", () => {
    const source = readReservationWidgetSource()

    const createMatch = source.match(/createReservation\(\s*\{([^}]*)\}/)
    expect(createMatch).not.toBeNull()
    expect(createMatch?.[1]).toMatch(/\bemail\b/)

    const emailIdIdx = source.search(/id=["']res-email["']/)
    expect(emailIdIdx).toBeGreaterThanOrEqual(0)
    const emailInput = source.slice(
      source.lastIndexOf("<Input", emailIdIdx),
      source.indexOf("/>", emailIdIdx) + 2,
    )
    expect(emailInput).toMatch(/\brequired\b/)

    const phoneIdIdx = source.search(/id=["']res-phone["']/)
    expect(phoneIdIdx).toBeGreaterThanOrEqual(0)
    const phoneInput = source.slice(
      source.lastIndexOf("<Input", phoneIdIdx),
      source.indexOf("/>", phoneIdIdx) + 2,
    )
    expect(phoneInput).not.toMatch(/\brequired\b/)

    const emailLabelIdx = source.search(/htmlFor=["']res-email["']/)
    expect(emailLabelIdx).toBeGreaterThanOrEqual(0)
    const emailLabelClose = source.indexOf("</Label>", emailLabelIdx)
    const emailLabel = source.slice(
      source.lastIndexOf("<Label", emailLabelIdx),
      emailLabelClose + "</Label>".length,
    )
    expect(emailLabel).not.toMatch(/\(optional\)/)
  })
})

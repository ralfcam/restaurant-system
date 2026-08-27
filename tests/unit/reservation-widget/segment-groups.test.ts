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

describe("reservation widget grouped slot cards", () => {
  it("reservation widget renders grouped slot cards with until badges and does not use a time Select", () => {
    const source = readReservationWidgetSource()

    expect(source).toMatch(/\bgroupBookableSlots\b/)
    expect(source).toMatch(/\bslotUntilTime\b/)
    expect(source).toMatch(/data-testid=["']slot-group["']/)
    expect(source).toMatch(/data-testid=["']slot-card["']/)
    expect(source).toMatch(/data-testid=["']until["']/)
    expect(source).not.toMatch(/Select a time/)
    expect(source).not.toMatch(/<Select[^>]*\bvalue=\{slot\b/)
  })

  it("Réserver stays disabled until a slot is selected and picking a card does not skip guest details", () => {
    const source = readReservationWidgetSource()

    const pickSlotMatch = source.match(
      /function pickSlot\s*\([^)]*\)\s*\{([^}]*)\}/,
    )
    expect(pickSlotMatch).not.toBeNull()
    expect(pickSlotMatch?.[1]).not.toMatch(/setStep\s*\(\s*2\s*\)/)
    expect(source).toMatch(/\bonPick=\{pickSlot\}/)

    expect(source).toMatch(/data-testid=["']guests["']/)
    expect(source).toMatch(/data-testid=["']date["']/)
    expect(source).toMatch(/data-testid=["']time["']/)
    expect(source).toMatch(/type=["']single["']/)
    expect(source).toMatch(/defaultValue=\{?["']time["']\}?/)

    const reserveIdx = source.search(/data-testid=["']reserve["']/)
    expect(reserveIdx).toBeGreaterThanOrEqual(0)
    const aroundReserve = source.slice(
      Math.max(0, reserveIdx - 500),
      reserveIdx + 500,
    )
    expect(aroundReserve).toMatch(/disabled=\{[^}]*\bslot\b/)
    expect(aroundReserve).toMatch(/setStep\s*\(\s*2\s*\)/)
    expect(aroundReserve).not.toMatch(/\bcreateReservation\b/)
  })

  it("until-badge uses occupancy duration, not the safety buffer, and does not read expected_minutes", () => {
    const source = readReservationWidgetSource()

    const untilIdx = source.search(/data-testid=["']until["']/)
    expect(untilIdx).toBeGreaterThanOrEqual(0)

    const untilCalls = [
      ...source.matchAll(/slotUntilTime\s*\(\s*([^)]*)\s*\)/g),
    ]
    expect(untilCalls.length).toBeGreaterThan(0)
    for (const match of untilCalls) {
      expect(match[1]).toMatch(/^\s*\w+\s*,\s*[\s\S]*occupanc/i)
      expect(match[1]).not.toMatch(/buffer/i)
      expect(match[1]).not.toMatch(/\+/)
    }

    const untilPath = source.slice(Math.max(0, untilIdx - 250), untilIdx + 400)
    expect(untilPath).not.toMatch(/nextBookableTime/)
    expect(untilPath).not.toMatch(/\bexpected_minutes\b/)
    expect(source).not.toMatch(/tables\.expected_minutes/)
  })
})

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

describe("reservation widget DialogTrigger API", () => {
  it("reservation widget DialogTrigger uses Base UI render composition", () => {
    const source = readReservationWidgetSource()

    expect(source).not.toMatch(/<DialogTrigger\s+asChild\b/)
    expect(source).toMatch(/<DialogTrigger[\s\S]*?render\s*=/)
  })
})

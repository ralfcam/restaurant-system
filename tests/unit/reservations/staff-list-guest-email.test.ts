import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("staff list guest email", () => {
  it("staff list displays stored guest email with name and phone", () => {
    const manager = read("components/staff/reservations-manager.tsx")

    const guestNameAt = manager.indexOf("{r.guestName}")
    const phoneAt = manager.indexOf("{r.phone}")
    const partyAt = manager.indexOf("{r.partySize}")

    expect(guestNameAt).toBeGreaterThan(-1)
    expect(phoneAt).toBeGreaterThan(guestNameAt)
    expect(partyAt).toBeGreaterThan(phoneAt)

    const guestBlock = manager.slice(guestNameAt, partyAt)

    expect(guestBlock).toMatch(/\{r\.guestName\}/)
    expect(guestBlock).toMatch(/\{r\.phone\}/)

    // Visible contact text in the guest-information block. A ficha href
    // argument or a "Guest profile" link alone must not satisfy this.
    const contactText = guestBlock
      .replace(/guestProfileHref\s*\(\s*r\.email\s*\)/g, "")
      .replace(/\b[\w-]+\s*=\s*\{\s*r\.email\s*\}/g, "")
      .replace(/<Link\b[\s\S]*?>\s*Guest profile\s*<\/Link>/g, "")

    expect(contactText).toMatch(/(?<!=)\{\s*r\.email/)
  })

  it("staff list still shows name and phone when email is absent", () => {
    const manager = read("components/staff/reservations-manager.tsx")

    const mapAt = manager.indexOf("filtered.map((r)")
    const guestNameAt = manager.indexOf("{r.guestName}")
    const phoneAt = manager.indexOf("{r.phone}")
    const partyAt = manager.indexOf("{r.partySize}")

    expect(mapAt).toBeGreaterThan(-1)
    expect(guestNameAt).toBeGreaterThan(mapAt)
    expect(phoneAt).toBeGreaterThan(guestNameAt)
    expect(partyAt).toBeGreaterThan(phoneAt)

    const rowBlock = manager.slice(mapAt, partyAt)

    expect(rowBlock).toMatch(/\{r\.guestName\}/)
    expect(rowBlock).toMatch(/\{r\.phone\}/)

    // Absent email must not invent a placeholder address.
    expect(rowBlock).not.toMatch(/r\.email\s*\?\?\s*["'`][^"`']+["'`]/)
    expect(rowBlock).not.toMatch(/r\.email\s*\|\|\s*["'`][^"`']+["'`]/)
    expect(rowBlock).not.toMatch(/\{\s*String\s*\(\s*r\.email/)
    expect(rowBlock).not.toMatch(
      /["'`](?:null|undefined|N\/A|No e-?mail)["'`]/i,
    )

    // Address line omitted unless stored email is non-blank after trim.
    // guestProfileHref already blank-checks the ficha link — that is not
    // this gate. Unconditional <p>{r.email}</p> fails until one exists.
    const addressLine = rowBlock
      .replace(/guestProfileHref\s*\(\s*r\.email\s*\)/g, "")
      .replace(/\b[\w-]+\s*=\s*\{\s*r\.email\s*\}/g, "")
      .replace(/<Link\b[\s\S]*?>\s*Guest profile\s*<\/Link>/g, "")

    expect(addressLine).toMatch(
      /r\.email\s*\?\.trim\s*\(\s*\)|r\.email\s*&&\s*r\.email\.trim\s*\(\s*\)|\(\s*r\.email\s*\?\?\s*["'`]{2}\s*\)\.trim\s*\(\s*\)|normalizeGuestEmail\s*\(\s*r\.email\s*\)/,
    )
  })
})

import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const localizedHomepagePath = path.join(repoRoot, "app", "[locale]", "page.tsx")

function readHomepageSource() {
  return readFileSync(localizedHomepagePath, "utf8")
}

function divMarkupFrom(source: string, divStart: number): string | null {
  const re = /<div\b|<\/div>/g
  re.lastIndex = divStart
  let depth = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    if (match[0].startsWith("<div")) {
      depth += 1
    } else {
      depth -= 1
      if (depth === 0) {
        return source.slice(divStart, match.index + match[0].length)
      }
    }
  }
  return null
}

function isTwoColumnAtMd(markup: string): boolean {
  if (/\bmd:grid-cols-2\b/.test(markup)) return true
  if (/\bmd:grid\b/.test(markup) && /\bgrid-cols-2\b/.test(markup)) return true
  if (/\bmd:flex\b/.test(markup) && /\bflex-row\b/.test(markup)) return true
  if (/\bflex-col\b/.test(markup) && /\bmd:flex-row\b/.test(markup)) return true
  return false
}

describe("homepage hero / reservation layout", () => {
  it("homepage hero and reservation widget use a two-column layout at md and up", () => {
    const source = readHomepageSource()

    const taglineIdx = source.indexOf('t("hero.tagline")')
    const headlineIdx = source.indexOf('t("hero.headline")')
    const reserveIdx = source.search(/id=["']reserve["']/)
    const widgetIdx = source.indexOf("<ReservationWidget")

    expect(taglineIdx).toBeGreaterThan(-1)
    expect(headlineIdx).toBeGreaterThan(taglineIdx)
    expect(reserveIdx).toBeGreaterThan(headlineIdx)
    expect(widgetIdx).toBeGreaterThan(reserveIdx)

    const maxW6xlIdx = source.lastIndexOf("max-w-6xl", taglineIdx)
    const containerOpen = source.lastIndexOf("<div", maxW6xlIdx)
    const heroLayout = source.slice(
      containerOpen,
      widgetIdx + "<ReservationWidget".length,
    )

    expect(isTwoColumnAtMd(heroLayout)).toBe(true)
    expect(heroLayout).toMatch(/id=["']reserve["'][\s\S]*<ReservationWidget\b/)

    const maxWxlOpen = source.search(/<div\s+className=["']max-w-xl["']/)
    if (maxWxlOpen >= 0) {
      const maxWxlMarkup = divMarkupFrom(source, maxWxlOpen)
      expect(maxWxlMarkup).not.toBeNull()
      const wrapsHeroAndReserve =
        /hero\.tagline/.test(maxWxlMarkup!) &&
        /id=["']reserve["']/.test(maxWxlMarkup!)
      expect(wrapsHeroAndReserve && !isTwoColumnAtMd(maxWxlMarkup!)).toBe(false)
    }
  })
})

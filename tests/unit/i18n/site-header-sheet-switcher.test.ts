import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const siteHeaderPath = path.join(
  process.cwd(),
  "components",
  "site",
  "site-header.tsx",
)

function readSiteHeaderSource() {
  return readFileSync(siteHeaderPath, "utf8")
}

/** Isolate one JSX tag so `onClick={() =>` `>` cannot truncate, and later siblings cannot leak in. */
function extractJsxTag(source: string, tagName: string): string | null {
  const start = source.indexOf(`<${tagName}`)
  if (start < 0) return null

  let i = start + tagName.length + 1
  let brace = 0
  let quote: string | null = null

  while (i < source.length) {
    const ch = source[i]!
    if (quote) {
      if (ch === "\\" && quote !== "'") {
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch
      i += 1
      continue
    }
    if (ch === "{") {
      brace += 1
      i += 1
      continue
    }
    if (ch === "}") {
      brace -= 1
      i += 1
      continue
    }
    if (brace !== 0) {
      i += 1
      continue
    }
    if (source.startsWith("/>", i)) {
      return source.slice(start, i + 2)
    }
    if (ch === ">") {
      const close = `</${tagName}>`
      const end = source.indexOf(close, i)
      if (end < 0) return source.slice(start, i + 1)
      return source.slice(start, end + close.length)
    }
    i += 1
  }

  return null
}

describe("site header mobile sheet language switcher", () => {
  it("mobile LanguageSwitcher closes the sheet", () => {
    const source = readSiteHeaderSource()
    const sheetContent = /<SheetContent[\s\S]*?<\/SheetContent>/.exec(source)?.[0]
    expect(sheetContent).toBeDefined()

    const switcher = extractJsxTag(sheetContent!, "LanguageSwitcher")
    expect(switcher).toBeDefined()

    const inlineClose =
      /(?:onClick|onNavigate)=\{[\s\S]*setMobileMenuOpen\(\s*false\s*\)/.test(
        switcher!,
      )
    const namedHandler = /(?:onClick|onNavigate)=\{([A-Za-z_$][\w$]*)\}/.exec(
      switcher!,
    )
    const namedClosesSheet =
      namedHandler != null &&
      new RegExp(
        `(?:const|function)\\s+${namedHandler[1]}\\b[\\s\\S]*setMobileMenuOpen\\(\\s*false\\s*\\)`,
      ).test(source)

    expect(inlineClose || namedClosesSheet).toBe(true)
  })
})

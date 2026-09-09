import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const layoutPath = path.join(process.cwd(), "app", "layout.tsx")

describe("document language", () => {
  it("resolveDocumentLang follows public locale and staff English", async () => {
    const { resolveDocumentLang } = await import("@/lib/i18n/document-lang")

    expect(resolveDocumentLang("/")).toBe("fr")
    expect(resolveDocumentLang("/menu")).toBe("fr")
    expect(resolveDocumentLang("/en")).toBe("en")
    expect(resolveDocumentLang("/en/menu")).toBe("en")
    expect(resolveDocumentLang("/admin")).toBe("en")
    expect(resolveDocumentLang("/pos")).toBe("en")
    expect(resolveDocumentLang("/kds")).toBe("en")
    expect(resolveDocumentLang("/auth/login")).toBe("en")

    const source = readFileSync(layoutPath, "utf8")
    expect(source).toMatch(/resolveDocumentLang\s*\(/)
    expect(source).toMatch(/<html[\s\S]*\blang=\{/)
    expect(source).not.toMatch(/\blang=["']fr["']/)
  })
})

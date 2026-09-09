import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const layoutPath = path.join(process.cwd(), "app", "layout.tsx")

function resolveLocalModule(
  specifier: string,
  fromFile: string,
): string | null {
  const base = specifier.startsWith("@/")
    ? path.join(process.cwd(), specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier)
  for (const ext of [
    "",
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    "/index.tsx",
    "/index.ts",
  ]) {
    const candidate = base + ext
    if (existsSync(candidate)) return candidate
  }
  return null
}

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

  it("layout mounts a client document-lang sync from usePathname", () => {
    const layoutSource = readFileSync(layoutPath, "utf8")
    const importRe =
      /import\s+(?:(\w+)|\{([^}]+)\})\s+from\s+["'](@\/[^"']+|\.[^"']+)["']/g

    const mountedClientSyncers: string[] = []
    let match: RegExpExecArray | null
    while ((match = importRe.exec(layoutSource))) {
      const names = match[1]
        ? [match[1]]
        : match[2]
            .split(",")
            .map((part) =>
              part
                .trim()
                .split(/\s+as\s+/)
                .pop()
                ?.trim(),
            )
            .filter((name): name is string => Boolean(name))
      const modulePath = resolveLocalModule(match[3], layoutPath)
      if (!modulePath) continue
      const moduleSource = readFileSync(modulePath, "utf8")
      const isClient = /["']use client["']/.test(moduleSource)
      const usesPathname = /\busePathname\b/.test(moduleSource)
      const usesResolve = /\bresolveDocumentLang\b/.test(moduleSource)
      const assignsLang = /document\.documentElement\.lang\s*=/.test(
        moduleSource,
      )
      if (!isClient || !usesPathname || !usesResolve || !assignsLang) continue
      const rendered = names.some((name) =>
        new RegExp(`<${name}\\b`).test(layoutSource),
      )
      if (rendered) mountedClientSyncers.push(modulePath)
    }

    expect(mountedClientSyncers.length).toBeGreaterThan(0)
  })
})

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const localizedHomepagePath = path.join(repoRoot, "app", "[locale]", "page.tsx")

function resolveLocalImport(specifier: string): string | null {
  let abs: string
  if (specifier.startsWith("@/")) {
    abs = path.join(repoRoot, specifier.slice(2))
  } else if (specifier.startsWith(".")) {
    abs = path.join(path.dirname(localizedHomepagePath), specifier)
  } else {
    return null
  }
  const candidates = [
    abs,
    `${abs}.tsx`,
    `${abs}.ts`,
    path.join(abs, "index.tsx"),
    path.join(abs, "index.ts"),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

/** One-level local modules from the locale homepage (MenuPage split: RSC + client). */
function localModuleSources(serverSource: string): string[] {
  const specifiers = [
    ...serverSource.matchAll(
      /from\s+["'](@\/components\/site\/[^"']+|\.[^"']+)["']/g,
    ),
  ].map((match) => match[1])

  return specifiers
    .map(resolveLocalImport)
    .filter((filePath): filePath is string => filePath !== null)
    .map((filePath) => readFileSync(filePath, "utf8"))
}

function chefsPicksCallArgument(source: string): string | null {
  const match = source.match(/\buseChefsPicks\s*\(([^)]*)\)/)
  if (!match) return null
  return match[1].trim()
}

describe("homepage Chef's picks SSR seed", () => {
  it("seeds useChefsPicks with server-fetched getHomepageChefsPicks data", () => {
    const server = readFileSync(localizedHomepagePath, "utf8")
    const tree = [server, ...localModuleSources(server)]
    const callArg = tree.map(chefsPicksCallArgument).find((arg) => arg !== null)

    expect(callArg).toEqual(expect.any(String))
    expect(callArg!.length).toBeGreaterThan(0)

    expect(server).toMatch(/\bawait\s+getHomepageChefsPicks\s*\(/)

    const argIdents = [...callArg!.matchAll(/\b[A-Za-z_][\w]*\b/g)]
      .map((match) => match[0])
      .filter((ident) => ident !== "await")
    expect(argIdents.some((ident) => server.includes(ident))).toBe(true)
  })
})

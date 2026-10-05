import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const PATCHED: Semver = [16, 3, 6]
const VULNERABLE_MIN: Semver = [16, 2, 0]

type Semver = [number, number, number]

function parseTriple(raw: string): Semver | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(raw)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compare(left: Semver, right: Semver): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

function format(version: Semver): string {
  return `${version[0]}.${version[1]}.${version[2]}`
}

/** Lowest version a package.json specifier can still install. */
function declaredMinimum(spec: string): Semver | null {
  const pinned = /^(?:\^|~)?(\d+\.\d+\.\d+)$/.exec(spec.trim())
  if (pinned) return parseTriple(pinned[1])

  const lowers = [...spec.matchAll(/>=(\d+\.\d+\.\d+)/g)]
    .map((match) => parseTriple(match[1]))
    .filter((version): version is Semver => version !== null)
  if (lowers.length === 0) return null
  return lowers.reduce((highest, current) =>
    compare(current, highest) > 0 ? current : highest,
  )
}

function insideVulnerableWindow(version: Semver): boolean {
  return compare(version, VULNERABLE_MIN) >= 0 && compare(version, PATCHED) < 0
}

describe("G-AUD1 patched Next", () => {
  it("next resolves at or above 16.3.6", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> }
    const declared = pkg.dependencies?.next
    const problems: string[] = []

    if (declared === undefined) {
      problems.push("package.json dependencies.next is missing")
    } else {
      const minimum = declaredMinimum(declared)
      if (!minimum) {
        problems.push(
          `package.json dependencies.next "${declared}" has no readable minimum`,
        )
      } else if (insideVulnerableWindow(minimum)) {
        problems.push(
          `package.json dependencies.next "${declared}" has minimum ${format(minimum)} inside >=16.2.0 <16.3.6`,
        )
      } else if (compare(minimum, PATCHED) < 0) {
        problems.push(
          `package.json dependencies.next "${declared}" has minimum ${format(minimum)} below 16.3.6`,
        )
      }
    }

    const lockfile = readFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "utf8")
    const lockVersions = new Set<string>()
    for (const match of lockfile.matchAll(/next@(\d+\.\d+\.\d+)/g)) {
      const index = match.index ?? 0
      const previous = index === 0 ? "" : lockfile[index - 1]
      // minimality: skip eslint-config-next and @next/*; only the next package token counts
      if (previous && /[\w@/-]/.test(previous)) continue
      lockVersions.add(match[1])
    }
    if (lockVersions.size === 0) {
      problems.push("pnpm-lock.yaml resolved no next@X.Y.Z versions")
    }
    for (const version of lockVersions) {
      const parsed = parseTriple(version)
      if (!parsed || compare(parsed, PATCHED) < 0) {
        problems.push(`pnpm-lock.yaml next@${version} is below 16.3.6`)
      }
    }

    const installedPath = path.join(
      repoRoot,
      "node_modules",
      "next",
      "package.json",
    )
    if (!existsSync(installedPath)) {
      problems.push("node_modules/next/package.json is missing")
    } else {
      const installed = JSON.parse(readFileSync(installedPath, "utf8")) as {
        version?: string
      }
      const parsed = installed.version ? parseTriple(installed.version) : null
      if (!parsed || compare(parsed, PATCHED) < 0) {
        problems.push(
          `node_modules/next package.json version ${installed.version ?? "missing"} is below 16.3.6`,
        )
      }
    }

    expect(problems).toEqual([])
  })
})

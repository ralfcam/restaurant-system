import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const BRACE_PATCHED: Semver = [5, 0, 7]
const BRACE_V3: Semver = [3, 0, 0]

type Semver = [number, number, number]

/** Sibling override keys may precede `hono`; the pin itself stays `4.12.25`. */
const HONO_OVERRIDE =
  /^overrides:\n(?:[ \t]+\S[^\n]*\n)*?[ \t]+hono:[ \t]+4\.12\.25[ \t]*$/m

function readPackageJson() {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  ) as {
    packageManager?: string
    pnpm?: { overrides?: Record<string, string> }
  }
}

function parseTriple(raw: string): Semver | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(raw)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compare(left: Semver, right: Semver): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

/** Lowest version an override specifier can still install. */
function specifierFloor(spec: string): Semver | null {
  const pinned = /^(?:\^|~)?(\d+\.\d+\.\d+)$/.exec(spec)
  if (pinned) return parseTriple(pinned[1])

  const floors = [...spec.matchAll(/>=(\d+\.\d+\.\d+)/g)]
    .map((match) => parseTriple(match[1]))
    .filter((version): version is Semver => version !== null)
  if (floors.length === 0) return null
  return floors.reduce((highest, current) =>
    compare(current, highest) > 0 ? current : highest,
  )
}

function overrideValue(yaml: string, key: string): string | undefined {
  const section = /^overrides:\n((?:[ \t]+.*\n)*)/m.exec(yaml)
  if (!section) return undefined
  const line = new RegExp(`^[ \\t]+${key}:[ \\t]+([^\\s#]+)`, "m").exec(
    section[1],
  )
  return line?.[1]?.replace(/^["']|["']$/g, "")
}

describe("pnpm override home", () => {
  it("pins packageManager and keeps the hono override in pnpm-workspace.yaml", () => {
    const pkg = readPackageJson()

    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/)
    expect(pkg.pnpm?.overrides).toBeUndefined()

    const workspace = readFileSync(
      path.join(repoRoot, "pnpm-workspace.yaml"),
      "utf8",
    )
    expect(workspace).toMatch(HONO_OVERRIDE)
    expect(workspace).toMatch(/allowBuilds:/)
    for (const pkgName of [
      "@parcel/watcher",
      "@swc/core",
      "esbuild",
      "msw",
      "sharp",
      "unrs-resolver",
    ]) {
      expect(workspace).toMatch(
        new RegExp(`["']?${pkgName.replace("/", "\\/")}["']?:\\s*true`),
      )
    }

    const lockfile = readFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "utf8")
    expect(lockfile).toMatch(HONO_OVERRIDE)

    const environment = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "environment.json"), "utf8"),
    ) as { install?: string }
    expect(environment.install).toContain("corepack prepare --activate")
    expect(environment.install).toContain("pnpm install --frozen-lockfile")
    expect(environment.install).not.toContain(
      "sh .cursor/cloud-install-coderabbit.sh",
    )
    expect(environment.install).not.toMatch(/--no-frozen-lockfile/)
  })

  it("brace-expansion override is at least 5.0.7", () => {
    const workspace = readFileSync(
      path.join(repoRoot, "pnpm-workspace.yaml"),
      "utf8",
    )
    const lockfile = readFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "utf8")
    const problems: string[] = []

    const vulnerable = new Set<string>()
    for (const match of lockfile.matchAll(/brace-expansion@(\d+\.\d+\.\d+)/g)) {
      const index = match.index ?? 0
      const previous = index === 0 ? "" : lockfile[index - 1]
      if (previous && /[\w@/-]/.test(previous)) continue
      const parsed = parseTriple(match[1])
      if (
        parsed &&
        compare(parsed, BRACE_V3) >= 0 &&
        compare(parsed, BRACE_PATCHED) < 0
      ) {
        vulnerable.add(match[1])
      }
    }
    for (const version of vulnerable) {
      problems.push(
        `pnpm-lock.yaml brace-expansion@${version} is >=3.0.0 and below 5.0.7`,
      )
    }

    const workspacePin = overrideValue(workspace, "brace-expansion")
    const lockPin = overrideValue(lockfile, "brace-expansion")
    if (workspacePin === undefined) {
      problems.push("pnpm-workspace.yaml overrides.brace-expansion is missing")
    } else {
      const floor = specifierFloor(workspacePin)
      if (!floor || compare(floor, BRACE_PATCHED) < 0) {
        problems.push(
          `pnpm-workspace.yaml overrides.brace-expansion ${workspacePin} is below 5.0.7`,
        )
      }
    }
    if (lockPin === undefined || lockPin !== workspacePin) {
      problems.push(
        `pnpm-lock.yaml overrides.brace-expansion is ${lockPin ?? "missing"} and does not match workspace ${workspacePin ?? "missing"}`,
      )
    }

    if (!HONO_OVERRIDE.test(workspace)) {
      problems.push("pnpm-workspace.yaml overrides.hono is not 4.12.25")
    }
    if (!HONO_OVERRIDE.test(lockfile)) {
      problems.push("pnpm-lock.yaml overrides.hono is not 4.12.25")
    }

    expect(problems).toEqual([])
  })

  it("does not leave the dead package.json pnpm field as the override source", () => {
    expect(existsSync(path.join(repoRoot, "pnpm-workspace.yaml"))).toBe(true)
    expect(readPackageJson()).not.toHaveProperty("pnpm")
  })

  it("packageManager equals the shipped pnpm@12.3.4 pin", () => {
    const pkg = readPackageJson()
    expect(pkg.packageManager).toBe("pnpm@12.3.4")
  })
})

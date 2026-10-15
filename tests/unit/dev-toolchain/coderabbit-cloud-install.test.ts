import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

const CLOUD_INSTALL =
  "corepack enable && corepack prepare pnpm@10.34.5 --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh"

function read(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8")
}

describe("Cloud CodeRabbit US pin", () => {
  it("environment.json install ends with the CLI helper", () => {
    const environment = JSON.parse(read(".cursor/environment.json")) as {
      install?: string
    }
    expect(environment.install).toBe(CLOUD_INSTALL)
  })

  it("installs pinned CLI 0.9.0 via the official installer without the key", () => {
    const script = read(".cursor/cloud-install-coderabbit.sh")

    expect(script.startsWith("#!/bin/sh")).toBe(true)
    expect(script).toMatch(/^set -eu$/m)
    expect(script).toMatch(/PINNED_VERSION="0\.9\.0"/)
    expect(script).toMatch(/https:\/\/cli\.coderabbit\.ai\/install\.sh/)
    expect(script).toMatch(
      /\|\s*env -u CODERABBIT_API_KEY CI=1 CR_CLI_SKIP_LOGIN=1 CODERABBIT_VERSION="\$\{PINNED_VERSION\}" sh/,
    )
    expect(script).not.toMatch(/^(?:export )?CODERABBIT_VERSION=v/m)
    expect(script).not.toMatch(/sha256sum|install_from_zip/)
    expect(script).not.toMatch(/^\s*set\s+-[a-z]*x/m)
  })

  it("logs in from the environment only and fails closed on US auth", () => {
    const script = read(".cursor/cloud-install-coderabbit.sh")

    expect(script).toMatch(/if \[ -z "\$\{CODERABBIT_API_KEY:-\}" \]/)
    expect(script).toMatch(
      /coderabbit auth login --api-key "\$\{CODERABBIT_API_KEY\}"/,
    )
    expect(script).not.toMatch(/--region eu/)
    expect(script).toMatch(/coderabbit auth status --agent/)
    expect(script).not.toMatch(/auth status --agent \|\| true/)
    expect(script).toMatch(/"authenticated":\[\[:space:\]\]\*true/)
    expect(script).toMatch(/"region":\[\[:space:\]\]\*"us"/)
  })

  it("cloud.Dockerfile installs the same pin through the installer with the key stripped", () => {
    const dockerfile = read(".cursor/cloud.Dockerfile")
    expect(dockerfile).toMatch(/ENV CODERABBIT_VERSION=0\.9\.0/)
    expect(dockerfile).toMatch(
      /install\.sh \| env -u CODERABBIT_API_KEY CR_CLI_SKIP_LOGIN=1 sh/,
    )
    expect(dockerfile).not.toMatch(/0\.7\.6/)
  })

  it("shares one CLI pin across the helper, cloud.Dockerfile and PINNED_CLI_VERSION", () => {
    const policy = read(".cursor/hooks/lib/coderabbit-review-policy.mjs")
    const pin = /export const PINNED_CLI_VERSION = "([^"]+)"/.exec(policy)?.[1]
    expect(pin).toBe("0.9.0")
    expect(read(".cursor/cloud-install-coderabbit.sh")).toContain(
      `PINNED_VERSION="${pin}"`,
    )
    expect(read(".cursor/cloud.Dockerfile")).toContain(
      `ENV CODERABBIT_VERSION=${pin}`,
    )
  })

  describe("dev-toolchain spec states the shipped install", () => {
    const spec = read("docs/specs/dev-toolchain.md")
    const clause = (from: string, to: string) =>
      spec.slice(spec.indexOf(from), spec.indexOf(to)).replace(/\s+/g, " ")
    const gO1 = clause("6. **G-O1", "7. **G-CR1")
    const gCr1 = clause("7. **G-CR1", "8. **G-CR2")
    const gEnv1 = clause("22. **G-ENV1", "23. **G-MIG1")
    const paused =
      /install is paused|not invoked|MUST NOT invoke|MUST NOT include `sh /

    it("G-O1 and G-ENV1 pin the exact install string with the helper last", () => {
      expect(gO1).toContain(`\`${CLOUD_INSTALL}\``)
      expect(gO1).not.toMatch(paused)
      expect(gEnv1).toContain("byte-identical to G-O1 and G-CR1")
      expect(gEnv1).toContain("env -u CODERABBIT_API_KEY")
      expect(gEnv1).not.toMatch(paused)
    })

    it("G-CR1 states the shared pin, key-stripped installer and environment-only login", () => {
      expect(gCr1).toContain('PINNED_VERSION="0.9.0"')
      expect(gCr1).toContain("ENV CODERABBIT_VERSION=0.9.0")
      expect(gCr1).toContain("PINNED_CLI_VERSION")
      expect(gCr1).toContain(
        "env -u CODERABBIT_API_KEY CI=1 CR_CLI_SKIP_LOGIN=1",
      )
      expect(gCr1).toContain(
        'coderabbit auth login --api-key "${CODERABBIT_API_KEY}"',
      )
      expect(gCr1).toContain("warns on stderr and exits 0 without logging in")
      expect(gCr1).toContain("`unauthenticated`")
      expect(gCr1).toContain("MUST NOT run `coderabbit auth login`")
      expect(gCr1).not.toMatch(paused)
      expect(gCr1).not.toContain("--region us --api-key")
      expect(gCr1).not.toContain("require `CODERABBIT_API_KEY`")
    })
  })

  it("records cli_paused before readPinnedAuth outside test mode", () => {
    const gate = read(".cursor/checks/coderabbit-gate.mjs")
    const pause = gate.indexOf('unavailable("cli_paused"')
    const authCall = gate.indexOf("pinned = readPinnedAuth")
    expect(pause).toBeGreaterThan(-1)
    expect(authCall).toBeGreaterThan(pause)
    expect(gate.slice(Math.max(0, pause - 120), pause)).toMatch(
      /!isTestMode\(\)/,
    )
  })
})

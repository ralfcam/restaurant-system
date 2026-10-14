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

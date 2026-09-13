import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

const CLOUD_INSTALL =
  "corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh"

function readInstallScript() {
  return readFileSync(
    path.join(repoRoot, ".cursor", "cloud-install-coderabbit.sh"),
    "utf8",
  )
}

describe("Cloud CodeRabbit US pin", () => {
  it("environment.json install is the fail-closed Cloud helper command", () => {
    const environment = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "environment.json"), "utf8"),
    ) as { install?: string }
    expect(environment.install).toBe(CLOUD_INSTALL)
  })

  it("pins CLI 0.7.6, reinstalls on mismatch, and fails closed for US auth", () => {
    const script = readInstallScript()

    expect(script.startsWith("#!/bin/sh")).toBe(true)
    expect(script).toMatch(/^set -eu$/m)
    expect(script).toMatch(/CODERABBIT_VERSION="?\$\{PINNED_VERSION\}"?/)
    expect(script).toMatch(/PINNED_VERSION="0\.7\.6"/)
    expect(script).not.toMatch(/^(?:export )?CODERABBIT_VERSION=v0\.7\.6/m)
    expect(script).toMatch(/if \[ "\$\{current\}" != "\$\{PINNED_VERSION\}" \]/)
    expect(script).toMatch(
      /curl -fsSL https:\/\/cli\.coderabbit\.ai\/install\.sh \| sh/,
    )

    expect(script).toMatch(/if \[ -z "\$\{CODERABBIT_API_KEY:-\}" \]/)
    expect(script).not.toMatch(/if \[ -n "\$\{CODERABBIT_API_KEY:-\}" \]/)
    expect(script).toMatch(
      /coderabbit auth login --region us --api-key "\$\{CODERABBIT_API_KEY\}"/,
    )
    expect(script).toMatch(/coderabbit auth status --agent/)
    expect(script).not.toMatch(/auth status --agent \|\| true/)
    expect(script).toMatch(/"authenticated":\[\[:space:\]\]\*true/)
    expect(script).toMatch(/"region":\[\[:space:\]\]\*"us"/)
    expect(script).not.toMatch(/--region eu/)
  })
})

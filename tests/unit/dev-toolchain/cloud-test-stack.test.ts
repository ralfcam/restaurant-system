import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const CLOUD_INSTALL =
  "corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile"

describe("cloud test stack", () => {
  it("keeps the install string and adds Docker start plus the supabase helper", () => {
    const environment = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "environment.json"), "utf8"),
    ) as { install?: string; start?: string; build?: { dockerfile?: string } }
    const dockerfile = readFileSync(
      path.join(repoRoot, ".cursor", "cloud.Dockerfile"),
      "utf8",
    )
    const script = readFileSync(
      path.join(repoRoot, ".cursor", "cloud-supabase-up.sh"),
      "utf8",
    )
    const sdd = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "sdd-to-tdd.md"),
      "utf8",
    )

    expect(environment.install).toBe(CLOUD_INSTALL)
    expect(environment.start).toBe("sudo service docker start")
    expect(environment.build?.dockerfile).toBe("cloud.Dockerfile")
    expect(dockerfile).toContain("fuse-overlayfs")
    expect(dockerfile).toContain("iptables-legacy")
    expect(dockerfile).toContain("corepack enable")
    expect(dockerfile).toContain("libnss3")
    expect(dockerfile).toContain("unzip")
    expect(dockerfile).toContain("mkdir -p /etc/ssh/sshd_config.d")
    expect(script).toContain("npx supabase start")
    expect(script).toContain("npx supabase db reset --local")
    expect(script).toContain("npx supabase status -o env")
    expect(script).toContain("--override-name api.url=NEXT_PUBLIC_SUPABASE_URL")
    expect(script).toContain(
      "--override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
    expect(script).toContain(
      "--override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY",
    )
    expect(script).toContain('grep -q "^$k="')
    expect(script).toContain("pnpm exec playwright install chromium")
    expect(sdd).toContain("sh .cursor/cloud-supabase-up.sh")
    expect(sdd).toContain(
      "set -a; . supabase/.temp/cloud-test.env; set +a; <command>",
    )
  })
})

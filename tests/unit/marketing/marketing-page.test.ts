import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const marketingDir = path.join(root, "app/admin/marketing")
const marketingPage = path.join(marketingDir, "page.tsx")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function readMarketingTree() {
  if (!existsSync(marketingDir)) return ""
  return readdirSync(marketingDir)
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => readFileSync(path.join(marketingDir, name), "utf8"))
    .join("\n")
}

describe("/admin/marketing staff page", () => {
  it("/admin/marketing exposes toggle copy Maps URL delay; staff nav links it", () => {
    expect(existsSync(marketingPage)).toBe(true)

    const source = readMarketingTree()
    expect(source).toMatch(/data-testid=["']review-email-enabled-control["']/)
    expect(source).toMatch(/data-testid=["']review-email-copy-control["']/)
    expect(source).toMatch(/data-testid=["']review-email-maps-url-control["']/)
    expect(source).toMatch(/data-testid=["']review-email-delay-control["']/)

    const shell = read("components/staff/staff-shell.tsx")
    expect(shell).toMatch(/href:\s*["']\/admin\/marketing["']/)

    const setupGroup =
      shell.match(/label:\s*["']Setup["'][\s\S]{0,500}/)?.[0] ?? ""
    expect(setupGroup).toMatch(/["']\/admin\/marketing["']/)
  })
})

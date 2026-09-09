import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("review email cron schedule", () => {
  it("does not register a Vercel cron (Hobby rejects hourly)", () => {
    const vercelJsonPath = path.join(root, "vercel.json")
    if (!existsSync(vercelJsonPath)) return
    const vercelJson = JSON.parse(readFileSync(vercelJsonPath, "utf8")) as {
      crons?: unknown[]
    }
    expect(vercelJson.crons ?? []).toEqual([])
  })

  it("schedules hourly GET /api/cron/review-email via Supabase Edge Function", () => {
    const fn = readFileSync(
      path.join(root, "supabase", "functions", "review-email", "index.ts"),
      "utf8",
    )
    expect(fn).toMatch(/CRON_SECRET/)
    expect(fn).toMatch(/REVIEW_EMAIL_APP_URL/)
    expect(fn).toMatch("/api/cron/review-email")
    expect(fn).toMatch("Bearer")

    const config = readFileSync(
      path.join(root, "supabase", "config.toml"),
      "utf8",
    )
    expect(config).toMatch(/\[functions\.review-email\]/)
    expect(config).toMatch(/verify_jwt\s*=\s*false/)

    const baseline = readFileSync(
      path.join(root, "supabase", "migrations", "00000000000000_baseline.sql"),
      "utf8",
    )
    expect(baseline).toContain("review-email-hourly")
    expect(baseline).toContain("0 * * * *")
    expect(baseline).toContain("/functions/v1/review-email")
  })
})

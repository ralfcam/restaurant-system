import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("event_inquiries schema", () => {
  it("baseline defines event_inquiries CHECKs", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(baseline).toContain("CREATE TABLE IF NOT EXISTS event_inquiries")

    const columns = baseline.match(
      /CREATE TABLE IF NOT EXISTS event_inquiries\s*\(([\s\S]*?)\);/,
    )?.[1]
    expect(columns).toBeTruthy()

    expect(columns).toMatch(/id UUID PRIMARY KEY/)
    expect(columns).toMatch(/guest_name TEXT NOT NULL/)
    expect(columns).toMatch(/email TEXT/)
    expect(columns).not.toMatch(/email TEXT NOT NULL/)
    expect(columns).toMatch(/phone TEXT/)
    expect(columns).not.toMatch(/phone TEXT NOT NULL/)
    expect(columns).toMatch(/requested_date DATE NOT NULL/)
    expect(columns).toMatch(/party_size INT(?:EGER)? NOT NULL/)
    expect(columns).toMatch(/CHECK\s*\(\s*party_size\s*>=\s*1\s*\)/)
    expect(columns).toMatch(/kind TEXT/)
    expect(columns).not.toMatch(/kind TEXT NOT NULL/)
    expect(columns).toMatch(/kind IN \('group',\s*'private_event'\)/)
    expect(columns).toMatch(/notes TEXT/)
    expect(columns).not.toMatch(/notes TEXT NOT NULL/)
    expect(columns).toMatch(/status TEXT NOT NULL DEFAULT 'open'/)
    expect(columns).toMatch(
      /status IN \('open',\s*'contacted',\s*'declined',\s*'closed'\)/,
    )
    expect(columns).toMatch(/created_at/)
    expect(columns).toMatch(/updated_at/)
    expect(columns).toMatch(
      /CHECK\s*\(\s*(?:NULLIF\s*\(\s*)?(?:BTRIM|TRIM)\s*\(\s*(?:COALESCE\s*\(\s*)?(?:email|phone)[\s\S]{0,240}(?:NULLIF\s*\(\s*)?(?:BTRIM|TRIM)\s*\(\s*(?:COALESCE\s*\(\s*)?(?:email|phone)/i,
    )

    const analytics = read("app/actions/analytics.ts")
    expect(analytics).not.toMatch(/event_inquiries/)
  })
})

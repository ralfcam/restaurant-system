import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("review email cron schedule", () => {
  it("vercel.json schedules hourly GET /api/cron/review-email", () => {
    const vercelJson = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: Array<{ path: string; schedule: string }> }

    expect(vercelJson.crons).toEqual(
      expect.arrayContaining([
        { path: "/api/cron/review-email", schedule: "0 * * * *" },
      ]),
    )
  })
})

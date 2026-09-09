import { readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => {
  const factoryMailer = { send: vi.fn() }
  return {
    processDueReviewEmails: vi.fn(),
    createReviewEmailMailer: vi.fn(() => factoryMailer),
    factoryMailer,
  }
})

vi.mock("@/lib/marketing/review-email", () => ({
  processDueReviewEmails: mocks.processDueReviewEmails,
}))

vi.mock("@/lib/marketing/review-email-mailer", () => ({
  createReviewEmailMailer: mocks.createReviewEmailMailer,
}))

describe("review email cron mailer factory", () => {
  beforeEach(() => {
    mocks.processDueReviewEmails.mockReset()
    mocks.processDueReviewEmails.mockResolvedValue(undefined)
    mocks.createReviewEmailMailer.mockReset()
    mocks.createReviewEmailMailer.mockReturnValue(mocks.factoryMailer)
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("authorized cron GET passes createReviewEmailMailer result into processDue", async () => {
    const { GET } = await import("@/app/api/cron/review-email/route")
    const request = new NextRequest(
      new URL("http://localhost/api/cron/review-email"),
      { headers: { authorization: "Bearer test-cron-secret" } },
    )

    await GET(request)

    expect(mocks.createReviewEmailMailer).toHaveBeenCalled()
    expect(mocks.processDueReviewEmails).toHaveBeenCalledWith({
      mailer: mocks.factoryMailer,
    })

    const source = readFileSync(
      path.join(
        process.cwd(),
        "app",
        "api",
        "cron",
        "review-email",
        "route.ts",
      ),
      "utf8",
    )
    expect(source).not.toMatch(
      'throw new Error("Mail provider is not configured.")',
    )
  })
})

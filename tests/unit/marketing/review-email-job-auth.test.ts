import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  processDueReviewEmails: vi.fn(),
}))

vi.mock("@/lib/marketing/review-email", () => ({
  processDueReviewEmails: mocks.processDueReviewEmails,
}))

describe("review email send job", () => {
  beforeEach(() => {
    mocks.processDueReviewEmails.mockReset()
    mocks.processDueReviewEmails.mockResolvedValue(undefined)
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("unauthenticated send-job invocation does not send", async () => {
    const { GET } = await import("@/app/api/cron/review-email/route")
    const url = new URL("http://localhost/api/cron/review-email")

    const cases: Array<{ headers?: HeadersInit }> = [
      {},
      { headers: { authorization: "Bearer not-the-secret" } },
    ]

    for (const scenario of cases) {
      mocks.processDueReviewEmails.mockClear()
      const request = new NextRequest(url, { headers: scenario.headers })
      await GET(request)
      expect(mocks.processDueReviewEmails).not.toHaveBeenCalled()
    }
  })
})

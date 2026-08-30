import { processDueReviewEmails } from "@/lib/marketing/review-email"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  // PV-9: empty/unset CRON_SECRET is 401 — never compare `Bearer ${undefined}`.
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 })
  }

  await processDueReviewEmails({
    mailer: {
      send() {
        throw new Error("Mail provider is not configured.")
      },
    },
  })
  return new NextResponse(null, { status: 200 })
}

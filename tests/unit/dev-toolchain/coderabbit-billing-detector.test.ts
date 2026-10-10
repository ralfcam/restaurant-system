import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  evaluateAgentStream,
  eventLooksBilling,
  parseJsonl,
} from "../../../.cursor/hooks/lib/coderabbit-review-policy.mjs"

const BILLING_FIXTURE = path.join(
  process.cwd(),
  ".cursor",
  "checks",
  "fixtures",
  "coderabbit",
  "local-billing.jsonl",
)

describe("G-CR2 billing detector", () => {
  it("eventLooksBilling matches error content not billing-named file paths", () => {
    expect(eventLooksBilling({ type: "billing" })).toBe(true)
    expect(eventLooksBilling({ status: "billing" })).toBe(true)
    expect(
      eventLooksBilling({
        type: "status",
        message: "Billing confirmation required before using usage credits",
      }),
    ).toBe(true)
    expect(eventLooksBilling({ type: "error", reason: "billing quota" })).toBe(
      true,
    )
    expect(eventLooksBilling({ type: "error", code: "billing" })).toBe(true)

    expect(
      eventLooksBilling({
        type: "finding",
        file: "docs/billing.md",
        message: "Fix the table",
      }),
    ).toBe(false)
    expect(
      eventLooksBilling({
        type: "finding",
        path: "docs/TRD/testing/billing.md",
      }),
    ).toBe(false)

    expect(eventLooksBilling({ type: "error", error: "quota exceeded" })).toBe(
      true,
    )

    const parsed = parseJsonl(readFileSync(BILLING_FIXTURE, "utf8"))
    expect(parsed.ok).toBe(true)
    const result = evaluateAgentStream(parsed.events, {
      reviewablePaths: ["lib/example.ts"],
      base: "staging",
    })
    expect(result.reason).toBe("billing")
  })
})

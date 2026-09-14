import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  evaluateAgentStream,
  parseJsonl,
} from "../../../.cursor/hooks/lib/coderabbit-review-policy.mjs"

const FIX = path.join(
  process.cwd(),
  ".cursor",
  "checks",
  "fixtures",
  "coderabbit",
)

const EXPECTED = { reviewablePaths: ["lib/example.ts"], base: "staging" }

function loadEvents(name: string) {
  return parseJsonl(readFileSync(path.join(FIX, name), "utf8"))
}

function withReviewedFiles(
  events: Record<string, unknown>[],
  reviewedFiles: string[] | undefined,
) {
  return events.map((event) => {
    if (event.type !== "review_context" && event.type !== "complete") {
      return event
    }
    if (reviewedFiles === undefined) {
      const rest = { ...event }
      delete rest.reviewedFiles
      return rest
    }
    return { ...event, reviewedFiles }
  })
}

function withContextReviewedFiles(
  events: Record<string, unknown>[],
  reviewedFiles: string[] | undefined,
) {
  return events.map((event) => {
    if (event.type !== "review_context") {
      return event
    }
    if (reviewedFiles === undefined) {
      const rest = { ...event }
      delete rest.reviewedFiles
      delete rest.files
      delete rest.filesToReview
      return rest
    }
    return { ...event, reviewedFiles }
  })
}

function withCompleteReviewedFiles(
  events: Record<string, unknown>[],
  reviewedFiles: string[] | undefined,
) {
  return events.map((event) => {
    if (event.type !== "complete") {
      return event
    }
    if (reviewedFiles === undefined) {
      const rest = { ...event }
      delete rest.reviewedFiles
      return rest
    }
    return { ...event, reviewedFiles }
  })
}

describe("G-CR2 empty reviewedFiles fallback", () => {
  it("omitted CLI reviewedFiles mints the work-order dirty set", () => {
    const parsed = loadEvents("local-clean.jsonl")
    expect(parsed.ok).toBe(true)
    const cleanEvents = parsed.events as Record<string, unknown>[]

    const emptyResult = evaluateAgentStream(
      withReviewedFiles(cleanEvents, []),
      EXPECTED,
    )
    expect(emptyResult).toMatchObject({
      ok: true,
      reviewedFiles: ["lib/example.ts"],
    })

    const omittedResult = evaluateAgentStream(
      withReviewedFiles(cleanEvents, undefined),
      EXPECTED,
    )
    expect(omittedResult).toMatchObject({
      ok: true,
      reviewedFiles: ["lib/example.ts"],
    })

    const mismatch = loadEvents("local-scope-mismatch.jsonl")
    expect(mismatch.ok).toBe(true)
    const mismatchResult = evaluateAgentStream(mismatch.events, EXPECTED)
    expect(mismatchResult.reason).toBe("scope_mismatch")
  })

  it("omitted review_context file lists with matching complete.reviewedFiles mint", () => {
    const parsed = loadEvents("local-clean.jsonl")
    expect(parsed.ok).toBe(true)
    const cleanEvents = parsed.events as Record<string, unknown>[]

    const omittedContext = withContextReviewedFiles(cleanEvents, undefined)
    const omittedMint = evaluateAgentStream(omittedContext, EXPECTED)
    expect(omittedMint).toMatchObject({
      ok: true,
      reviewedFiles: ["lib/example.ts"],
    })

    const emptyContextMint = evaluateAgentStream(
      withContextReviewedFiles(cleanEvents, []),
      EXPECTED,
    )
    expect(emptyContextMint).toMatchObject({
      ok: true,
      reviewedFiles: ["lib/example.ts"],
    })

    const omittedMismatch = evaluateAgentStream(
      withCompleteReviewedFiles(omittedContext, ["lib/other.ts"]),
      EXPECTED,
    )
    expect(omittedMismatch.ok).toBe(false)
    expect(omittedMismatch.reason).toBe("reviewed_files_mismatch")

    const emptyMismatch = evaluateAgentStream(
      withCompleteReviewedFiles(withContextReviewedFiles(cleanEvents, []), [
        "lib/other.ts",
      ]),
      EXPECTED,
    )
    expect(emptyMismatch.ok).toBe(false)
    expect(emptyMismatch.reason).toBe("reviewed_files_mismatch")

    const listedEmptyComplete = evaluateAgentStream(
      withCompleteReviewedFiles(cleanEvents, []),
      EXPECTED,
    )
    expect(listedEmptyComplete.ok).toBe(false)
    expect(listedEmptyComplete.reason).toBe("reviewed_files_mismatch")
  })

  it("omitted reviewedFiles still fails unresolved_findings for a major", () => {
    const parsed = loadEvents("local-major.jsonl")
    expect(parsed.ok).toBe(true)

    const result = evaluateAgentStream(
      withReviewedFiles(parsed.events as Record<string, unknown>[], []),
      EXPECTED,
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("unresolved_findings")
  })

  it("omitted review_context keys still fail unresolved_findings for a major", () => {
    const parsed = loadEvents("local-major.jsonl")
    expect(parsed.ok).toBe(true)

    const result = evaluateAgentStream(
      withReviewedFiles(parsed.events as Record<string, unknown>[], undefined),
      EXPECTED,
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("unresolved_findings")
  })

  it("omitted reviewedFiles does not mint when a finding path is outside the work-order", () => {
    const parsed = loadEvents("local-trivial.jsonl")
    expect(parsed.ok).toBe(true)

    const events = withReviewedFiles(
      parsed.events as Record<string, unknown>[],
      [],
    ).map((event) =>
      event.type === "finding" ? { ...event, fileName: "app/other.ts" } : event,
    )

    const result = evaluateAgentStream(events, EXPECTED)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("scope_mismatch")
  })

  it("omitted reviewedFiles pins scope_mismatch for an out-of-work-order finding", () => {
    const parsed = loadEvents("local-trivial.jsonl")
    expect(parsed.ok).toBe(true)

    const events = withReviewedFiles(
      parsed.events as Record<string, unknown>[],
      undefined,
    ).map((event) =>
      event.type === "finding" ? { ...event, fileName: "app/other.ts" } : event,
    )

    const result = evaluateAgentStream(events, EXPECTED)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("scope_mismatch")
  })

  it("listed matching file lists do not mint when a finding path is outside the work-order", () => {
    const parsed = loadEvents("local-trivial.jsonl")
    expect(parsed.ok).toBe(true)

    const events = withReviewedFiles(
      parsed.events as Record<string, unknown>[],
      ["lib/example.ts"],
    ).map((event) =>
      event.type === "finding" ? { ...event, fileName: "app/other.ts" } : event,
    )

    const result = evaluateAgentStream(events, EXPECTED)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("scope_mismatch")
  })

  it("empty reviewedFiles does not ignore a non-empty files alias", () => {
    const parsed = loadEvents("local-clean.jsonl")
    expect(parsed.ok).toBe(true)
    const cleanEvents = parsed.events as Record<string, unknown>[]

    const events = withCompleteReviewedFiles(
      withContextReviewedFiles(cleanEvents, []).map((event) =>
        event.type === "review_context"
          ? { ...event, files: ["lib/other.ts"] }
          : event,
      ),
      [],
    )

    const result = evaluateAgentStream(events, EXPECTED)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("scope_mismatch")
  })

  it("matching reviewedFiles does not hide a mismatching files alias", () => {
    const parsed = loadEvents("local-clean.jsonl")
    expect(parsed.ok).toBe(true)
    const cleanEvents = parsed.events as Record<string, unknown>[]

    const events = withContextReviewedFiles(cleanEvents, [
      "lib/example.ts",
    ]).map((event) =>
      event.type === "review_context"
        ? { ...event, files: ["lib/other.ts"] }
        : event,
    )

    const result = evaluateAgentStream(events, EXPECTED)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("scope_mismatch")
  })

  it("null reviewedFiles does not dual-omission mint", () => {
    const parsed = loadEvents("local-clean.jsonl")
    expect(parsed.ok).toBe(true)
    const cleanEvents = parsed.events as Record<string, unknown>[]

    const nullContext = evaluateAgentStream(
      withCompleteReviewedFiles(
        withContextReviewedFiles(cleanEvents, undefined).map((event) =>
          event.type === "review_context"
            ? { ...event, reviewedFiles: null }
            : event,
        ),
        undefined,
      ),
      EXPECTED,
    )
    expect(nullContext.ok).toBe(false)
    expect(nullContext.reason).toBe("scope_mismatch")

    const nullComplete = evaluateAgentStream(
      withContextReviewedFiles(cleanEvents, undefined).map((event) =>
        event.type === "complete" ? { ...event, reviewedFiles: null } : event,
      ),
      EXPECTED,
    )
    expect(nullComplete.ok).toBe(false)
    expect(nullComplete.reason).toBe("reviewed_files_mismatch")
  })

  it("G-CR2 spec defers CLI pin to G-CR1", () => {
    const spec = readFileSync(
      path.join(process.cwd(), "docs", "specs", "dev-toolchain.md"),
      "utf8",
    )
    const gcr2Start = spec.indexOf("8. **G-CR2")
    const gcr3Start = spec.indexOf("9. **G-CR3")
    const gcr2Body = spec.slice(gcr2Start, gcr3Start)
    expect(gcr2Body).toContain("G-CR1")
    expect(gcr2Body).not.toContain("0.7.6")

    const gcr1Start = spec.indexOf("7. **G-CR1")
    const gcr1Body = spec.slice(gcr1Start, gcr2Start)
    expect(gcr1Body).toContain("CODERABBIT_VERSION=0.7.6")
  })

  it("G-CR2 makes local review outcomes advisory but keeps deterministic safety hard", () => {
    const spec = readFileSync(
      path.join(process.cwd(), "docs", "specs", "dev-toolchain.md"),
      "utf8",
    )
    const gcr2Body = spec.slice(
      spec.indexOf("8. **G-CR2"),
      spec.indexOf("9. **G-CR3"),
    )
    const normalized = gcr2Body.replace(/\s+/g, " ")
    expect(normalized).toContain("Mandatory advisory local JSONL review")
    expect(normalized).toContain("are advisory outcomes")
    expect(normalized).toContain("it never authorizes or blocks")
    expect(normalized).toContain("missing or malformed work order")
    expect(normalized).toContain("dirty bytes changing during review")
    expect(normalized).toContain("G-CR3 stays fail-closed and unchanged")
  })
})

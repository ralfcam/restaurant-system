import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  US_APP_ID,
  US_LATEST_HEAD_CHECK_NAME,
  classifyFindingRouting,
  evaluateReadyPr,
} from "../hooks/lib/coderabbit-pr-policy.mjs"

const FIX = join(process.cwd(), ".cursor", "checks", "fixtures", "coderabbit")
const WORKFLOW = join(
  process.cwd(),
  ".github",
  "workflows",
  "coderabbit-main-gate.yml",
)

function load(name) {
  return JSON.parse(readFileSync(join(FIX, name), "utf8"))
}

const CASES = [
  ["remote-clean.json", true, "clean"],
  ["remote-stale-approval.json", false, "stale_approval"],
  ["remote-incremental-paused.json", true, "incremental_paused"],
  ["remote-coderabbit-other.json", false, "wrong_bot"],
  ["remote-unresolved-threads.json", false, "unresolved_threads"],
  ["remote-rate-limit.json", false, "rate_limited"],
  ["remote-billing.json", false, "billing"],
  ["remote-override.json", false, "explicit_override"],
  ["remote-pending.json", false, "pending"],
  ["remote-draft.json", false, "draft"],
  ["remote-wrong-bot.json", false, "wrong_bot"],
]

for (const [file, ok, reason] of CASES) {
  test(`ready-PR snapshot ${file} → ${reason}`, () => {
    const result = evaluateReadyPr(load(file))
    assert.equal(result.ok, ok, file)
    assert.equal(result.reason, reason, file)
  })
}

test("clean snapshot pins US app id and check name", () => {
  const result = evaluateReadyPr(load("remote-clean.json"))
  assert.equal(result.usAppId, US_APP_ID)
  assert.equal(result.checkName, US_LATEST_HEAD_CHECK_NAME)
})

test("loop routing is severity-only and reports the round cap", () => {
  assert.equal(
    classifyFindingRouting({ severity: "critical" }, { loop: true }).command,
    "/sdd-to-tdd",
  )
  assert.equal(
    classifyFindingRouting({ severity: "major" }, { loop: true }).command,
    "/capture",
  )
  assert.equal(
    classifyFindingRouting({ severity: "minor" }, { loop: true }).command,
    "/capture",
  )
  assert.equal(
    classifyFindingRouting({ severity: "trivial" }, { loop: true }).command,
    "/capture",
  )
  assert.equal(
    classifyFindingRouting({ severity: "nope" }, { loop: true }).command,
    "/sdd-to-tdd",
  )
  assert.equal(
    classifyFindingRouting(
      { severity: "major", fileName: "lib/example.ts" },
      { loop: true, inScopePaths: ["lib/example.ts"] },
    ).command,
    "/capture",
  )
  const looped = evaluateReadyPr(
    {
      headSha: "a".repeat(40),
      isDraft: false,
      reviews: [
        {
          user: { login: "coderabbitai[bot]" },
          commit_id: "b".repeat(40),
          state: "COMMENTED",
        },
      ],
    },
    { loop: true },
  )
  assert.equal(looped.roundsUsed, 1)
  assert.equal(looped.roundCap, 3)
  const plain = evaluateReadyPr(load("remote-clean.json"))
  assert.equal(plain.roundsUsed, undefined)
})

function unresolvedLoopSnapshot(severity) {
  return {
    headSha: "a".repeat(40),
    isDraft: false,
    reviews: [
      {
        user: { login: "coderabbitai[bot]" },
        commit_id: "a".repeat(40),
        state: "COMMENTED",
      },
    ],
    threads: [
      {
        isResolved: false,
        path: "lib/example.ts",
        comments: [
          {
            databaseId: 1,
            user: { login: "coderabbitai[bot]" },
            path: "lib/example.ts",
            body: `| _${severity}_ | **Example**\n<!-- cr-comment:v1:${severity} -->\n`,
          },
        ],
      },
    ],
  }
}

test("loop mode treats a changes-requested head with resolved product threads as clean", () => {
  const resolved = unresolvedLoopSnapshot("Major")
  resolved.reviews[0].state = "CHANGES_REQUESTED"
  resolved.threads[0].isResolved = true
  const looped = evaluateReadyPr(resolved, { loop: true })
  assert.equal(looped.ok, true)
  assert.equal(looped.reason, "captured_threads_resolved")

  const stillOpen = unresolvedLoopSnapshot("Major")
  stillOpen.reviews[0].state = "CHANGES_REQUESTED"
  const open = evaluateReadyPr(stillOpen, { loop: true })
  assert.equal(open.ok, false)
  assert.equal(open.reason, "unresolved_threads")

  const noThread = unresolvedLoopSnapshot("Major")
  noThread.reviews[0].state = "CHANGES_REQUESTED"
  noThread.threads = []
  const bare = evaluateReadyPr(noThread, { loop: true })
  assert.equal(bare.ok, false)
  assert.equal(bare.reason, "changes_requested")

  const withoutLoop = evaluateReadyPr(resolved)
  assert.equal(withoutLoop.ok, false)
  assert.equal(withoutLoop.reason, "changes_requested")
})

test("loop mode routes an unresolved Major thread to /capture and Critical to /sdd-to-tdd", () => {
  const major = evaluateReadyPr(unresolvedLoopSnapshot("Major"), {
    loop: true,
  })
  assert.equal(major.ok, false)
  assert.equal(major.findings[0].command, "/capture")
  const critical = evaluateReadyPr(unresolvedLoopSnapshot("Critical"), {
    loop: true,
  })
  assert.equal(critical.findings[0].command, "/sdd-to-tdd")
})

test("in-scope findings route to /sdd-to-tdd; residuals to /capture", () => {
  assert.equal(
    classifyFindingRouting(
      { fileName: "lib/example.ts" },
      { inScopePaths: ["lib/example.ts"] },
    ).command,
    "/sdd-to-tdd",
  )
  assert.equal(
    classifyFindingRouting(
      { fileName: "docs/findings/tech-debt.md" },
      {
        inScopePaths: ["lib/example.ts"],
      },
    ).command,
    "/capture",
  )
})

test("main-gate workflow is read-only, staging→main, and named US latest-head", () => {
  const yml = readFileSync(WORKFLOW, "utf8")
  assert.match(yml, /name: CodeRabbit US latest-head gate/)
  assert.match(yml, /pull_request:/)
  assert.match(yml, /ready_for_review/)
  assert.match(yml, /pull_request_review:/)
  assert.match(yml, /pull_request_review_comment:/)
  assert.doesNotMatch(yml, /^  pull_request_review_thread:/m)
  const pullRequestStart = yml.indexOf("\n  pull_request:")
  const pullRequestReviewStart = yml.indexOf("\n  pull_request_review:")
  assert.ok(pullRequestStart >= 0, "pull_request mapping")
  assert.ok(
    pullRequestReviewStart > pullRequestStart,
    "pull_request mapping precedes pull_request_review",
  )
  const pullRequestBlock = yml.slice(pullRequestStart, pullRequestReviewStart)
  const typesMatch = pullRequestBlock.match(/^\s+types:\s*\[([^\]]*)\]/m)
  assert.ok(typesMatch, "pull_request types list")
  const pullRequestTypes = typesMatch[1]
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean)
  assert.ok(
    pullRequestTypes.includes("edited"),
    "on.pull_request.types includes edited",
  )
  assert.match(yml, /if:\s*false/)
  assert.doesNotMatch(
    yml,
    /if:.*github\.event\.pull_request\.head\.ref == 'staging'/,
  )
  assert.match(yml, /contents: read/)
  assert.match(yml, /pull-requests: read/)
  assert.doesNotMatch(yml, /contents:\s*write/)
  assert.doesNotMatch(yml, /pull-requests:\s*write/)
  assert.match(yml, /CodeRabbit US latest-head gate is paused\./)
  assert.doesNotMatch(yml, /coderabbit-pr-gate\.mjs/)
  assert.doesNotMatch(yml, /github\.event\.pull_request\.base\.sha/)
  assert.doesNotMatch(yml, /--use-credits/)
  assert.doesNotMatch(yml, /gh pr merge/)
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  NO_FORMAL_REVIEW_BODY_HEADING,
  NO_FORMAL_REVIEW_OPERATOR_COMMENT,
  US_APP_ID,
  US_LATEST_HEAD_CHECK_NAME,
  appendOperatorNoteToPrBody,
  classifyFindingRouting,
  decidePushCliAction,
  evaluateReadyPr,
  hasCodeRabbitReviewInProgress,
  isQuietModeWalkthroughBody,
  resolveOperatorNotePlacement,
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
  ["remote-pending.json", true, "ready_no_coderabbit_review"],
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

function commentedBodySnapshot(
  body,
  { state = "COMMENTED", sha = "abc123" } = {},
) {
  return {
    isDraft: false,
    headSha: sha,
    pull: {
      number: 12,
      isDraft: false,
      base: "main",
      head: "staging",
      headSha: sha,
    },
    reviews: [
      {
        user: { login: "coderabbitai[bot]" },
        state,
        commit_id: sha,
        body,
      },
    ],
    threads: [],
    issueComments: [],
    reviewComments: [],
    checkRuns: [],
  }
}

test("in-progress CodeRabbit check, status, or comment is review_in_progress", () => {
  for (const file of [
    "remote-review-in-progress-check.json",
    "remote-review-in-progress-status.json",
    "remote-review-in-progress-comment.json",
  ]) {
    const snapshot = load(file)
    assert.equal(hasCodeRabbitReviewInProgress(snapshot), true, file)
    const result = evaluateReadyPr(snapshot, { allowDraft: true })
    assert.equal(result.ok, false, file)
    assert.equal(result.reason, "review_in_progress", file)
  }

  const none = evaluateReadyPr(load("remote-pending.json"), {
    allowDraft: true,
  })
  assert.equal(
    hasCodeRabbitReviewInProgress(load("remote-pending.json")),
    false,
  )
  assert.equal(none.reason, "ready_no_coderabbit_review")

  const command = readFileSync(
    join(process.cwd(), ".cursor", "commands", "ready-merge-release.md"),
    "utf8",
  )
  assert.match(command, /review_in_progress/)
  assert.match(command, /no blind wait/)
})

test("push CLI action routes one fix round then leftover-pushes", () => {
  const critical = decidePushCliAction({
    attemptStatus: "findings",
    findings: [{ severity: "critical", id: "c1" }],
    priorRound: 0,
  })
  assert.equal(critical.action, "route")
  assert.equal(critical.sddToTdd[0].command, "/sdd-to-tdd")

  const major = decidePushCliAction({
    attemptStatus: "findings",
    findings: [{ severity: "major", id: "m1" }],
    priorRound: 0,
  })
  assert.equal(major.sddToTdd[0].command, "/sdd-to-tdd")

  const unknown = decidePushCliAction({
    attemptStatus: "findings",
    findings: [{ severity: "nope", id: "u1" }],
    priorRound: 0,
  })
  assert.equal(unknown.sddToTdd[0].command, "/sdd-to-tdd")

  const minor = decidePushCliAction({
    attemptStatus: "findings",
    findings: [{ severity: "minor", id: "n1" }],
    priorRound: 0,
  })
  assert.equal(minor.action, "route")
  assert.equal(minor.capture[0].command, "/capture")

  const leftover = decidePushCliAction({
    attemptStatus: "findings",
    findings: [{ severity: "critical", id: "c1" }],
    priorRound: 1,
  })
  assert.equal(leftover.action, "push")
  assert.equal(leftover.record, "leftover_after_fix_round")
  assert.equal(leftover.leftover.length, 1)

  const unavailable = decidePushCliAction({
    attemptStatus: "unavailable",
    findings: [],
    priorRound: 0,
  })
  assert.equal(unavailable.action, "push")
  assert.equal(unavailable.record, "unavailable")

  const clean = decidePushCliAction({
    attemptStatus: "clean",
    findings: [],
    priorRound: 0,
  })
  assert.equal(clean.action, "push")
  assert.deepEqual(clean.leftover, [])
})

test("no formal review on latest head is ready_no_coderabbit_review with operator comment", () => {
  const none = evaluateReadyPr(load("remote-pending.json"))
  assert.equal(none.ok, true)
  assert.equal(none.reason, "ready_no_coderabbit_review")
  assert.equal(none.operatorComment, NO_FORMAL_REVIEW_OPERATOR_COMMENT)
  assert.match(none.operatorComment, /@coderabbitai full review/)

  const draft = evaluateReadyPr(load("remote-draft.json"), { allowDraft: true })
  assert.equal(draft.ok, true)
  assert.equal(draft.reason, "ready_no_coderabbit_review")
  assert.equal(draft.operatorComment, NO_FORMAL_REVIEW_OPERATOR_COMMENT)

  const command = readFileSync(
    join(process.cwd(), ".cursor", "commands", "ready-merge-release.md"),
    "utf8",
  )
  assert.match(command, /ready_no_coderabbit_review/)
  assert.match(command, /gh pr comment/)
  assert.match(command, /operator comment/)
})

test("COMMENTED review with actionable findings blocks into /capture", () => {
  const result = evaluateReadyPr(
    commentedBodySnapshot(
      `| _Critical_ | **Leaked secret**\n<!-- cr-comment:v1:body-critical -->\n`,
    ),
  )
  assert.equal(result.ok, false)
  assert.equal(result.reason, "commented_review_findings")
  assert.equal(result.findings.length, 1)
  assert.equal(result.findings[0].command, "/capture")
  assert.equal(result.findings[0].route, "capture")
  assert.equal(result.findings[0].title, "Leaked secret")
})

test("quiet-mode walkthrough body is ignored", () => {
  assert.equal(isQuietModeWalkthroughBody("walkthrough"), true)
  assert.equal(
    isQuietModeWalkthroughBody(
      "<!-- This is an auto-generated comment: summarize by coderabbit.ai -->\n## Walkthrough\n<!-- walkthrough_start -->\nSummary only.\n<!-- walkthrough_end -->\n**Actionable comments posted: 0**\n",
    ),
    true,
  )
  assert.equal(
    isQuietModeWalkthroughBody(
      `| _Minor_ | **Real finding**\n<!-- cr-comment:v1:not-quiet -->\n`,
    ),
    false,
  )

  const quiet = evaluateReadyPr(
    commentedBodySnapshot(
      "<!-- This is an auto-generated comment: summarize by coderabbit.ai -->\n## Walkthrough\nQuiet summary.\n**Actionable comments posted: 0**\n",
    ),
  )
  assert.equal(quiet.ok, true)
  assert.equal(quiet.reason, "ready_no_coderabbit_review")
  assert.equal(quiet.findings, undefined)

  const wordOnly = evaluateReadyPr(commentedBodySnapshot("walkthrough"))
  assert.equal(wordOnly.ok, true)
  assert.equal(wordOnly.reason, "ready_no_coderabbit_review")
})

test("operator comment 403 is non-fatal and still readies", () => {
  const ready = evaluateReadyPr(load("remote-pending.json"))
  assert.equal(ready.ok, true)
  assert.equal(ready.reason, "ready_no_coderabbit_review")

  const outcome = resolveOperatorNotePlacement({
    commentPosted: false,
    commentStatus: 403,
    commentError: "HTTP 403: Resource not accessible by integration",
  })
  assert.equal(outcome.fatal, false)
  assert.equal(outcome.ready, true)
  assert.deepEqual(outcome.recordIn, ["pr_body", "report"])
  assert.match(outcome.log, /403/)
  assert.match(outcome.log, /issues: write/)

  const posted = resolveOperatorNotePlacement({ commentPosted: true })
  assert.equal(posted.fatal, false)
  assert.equal(posted.ready, true)
  assert.deepEqual(posted.recordIn, ["issue_comment"])

  const body = appendOperatorNoteToPrBody(
    "## Summary\n\nFeature work.",
    ready.operatorComment,
  )
  assert.match(body, new RegExp(NO_FORMAL_REVIEW_BODY_HEADING))
  assert.match(body, /No formal CodeRabbit review/)
  assert.equal(appendOperatorNoteToPrBody(body, ready.operatorComment), body)

  const command = readFileSync(
    join(process.cwd(), ".cursor", "commands", "ready-merge-release.md"),
    "utf8",
  )
  assert.match(command, /non-fatal/)
  assert.match(command, /403/)
  assert.match(command, /PR body/)
  assert.match(command, /issues: write/)
})

test("changes_requested_meta_only still passes for walkthrough-only formal reviews", () => {
  const meta = evaluateReadyPr(
    commentedBodySnapshot(
      "<!-- This is an auto-generated comment: summarize by coderabbit.ai -->\n## Walkthrough\nMeta only.\n",
      { state: "CHANGES_REQUESTED" },
    ),
  )
  assert.equal(meta.ok, true)
  assert.equal(meta.reason, "changes_requested_meta_only")

  const fixtureStyle = evaluateReadyPr(
    commentedBodySnapshot("walkthrough", { state: "CHANGES_REQUESTED" }),
  )
  assert.equal(fixtureStyle.ok, true)
  assert.equal(fixtureStyle.reason, "changes_requested_meta_only")

  const real = evaluateReadyPr(
    commentedBodySnapshot("", { state: "CHANGES_REQUESTED" }),
  )
  assert.equal(real.ok, false)
  assert.equal(real.reason, "changes_requested")
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

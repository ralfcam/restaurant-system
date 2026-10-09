/**
 * Pure PR CodeRabbit policy. US latest-head approval, no non-US CodeRabbit
 * identity, no unresolved CodeRabbit threads except `.cursor/plans/`
 * work-orders, outdated leftovers, or incremental-pause leftovers, no
 * rate-limit/billing/override markers, and deterministic severity routing
 * for active findings. A head with no formal US review is
 * `ready_no_coderabbit_review`. Quiet-mode walkthrough bodies are not
 * findings. A COMMENTED review body with actionable comments still blocks.
 */
import {
  US_APP_ID,
  containsOverrideMarker,
  eventLooksBilling,
  eventLooksRateLimited,
  isUsBotLogin,
} from "./coderabbit-review-policy.mjs"

export { US_APP_ID }

export const US_LATEST_HEAD_CHECK_NAME = "CodeRabbit US latest-head gate"
export const REQUIRED_US_STATUS_CONTEXT = "CodeRabbit"
export const AUTO_PAUSE_AFTER_REVIEWED_COMMITS_MIN = 20
export const CODERABBIT_PR_SEVERITIES = Object.freeze([
  "critical",
  "major",
  "minor",
  "trivial",
])

export function reviewAuthorLogin(review) {
  return review?.user?.login || review?.author?.login || review?.user || ""
}

export function reviewCommitId(review) {
  return (
    review?.commit_id ||
    review?.commitId ||
    review?.commit?.oid ||
    review?.commit?.sha ||
    ""
  )
}

export function reviewState(review) {
  return String(review?.state || "").toUpperCase()
}

export function checkAppId(run) {
  return Number(run?.app?.id || run?.app_id || 0)
}

export function checkAppSlug(run) {
  return String(run?.app?.slug || run?.app?.name || "").toLowerCase()
}

export function isUsApp(run) {
  return checkAppId(run) === US_APP_ID
}

function isCodeRabbitShaped(value) {
  return /coderabbit/i.test(String(value || ""))
}

function isNonUsCodeRabbitLogin(login) {
  return isCodeRabbitShaped(login) && !isUsBotLogin(login)
}

function isNonUsCodeRabbitApp(run) {
  return isCodeRabbitShaped(checkAppSlug(run)) && !isUsApp(run)
}

function threadComments(thread) {
  return (
    thread?.comments?.nodes || thread?.comments || thread?.commentNodes || []
  )
}

function commentAuthorLogin(comment) {
  return comment?.author?.login || comment?.user?.login || ""
}

function threadHasCommentLogin(thread, matchLogin) {
  return threadComments(thread).some((c) => matchLogin(commentAuthorLogin(c)))
}

export function threadHasCodeRabbit(thread) {
  return threadHasCommentLogin(thread, isUsBotLogin)
}

function threadHasNonUsCodeRabbit(thread) {
  return threadHasCommentLogin(thread, isNonUsCodeRabbitLogin)
}

function threadFilePath(thread) {
  const commentWithPath = threadComments(thread).find((c) => c?.path)
  return String(thread?.path || commentWithPath?.path || "")
}

function isWorkOrderPlanThread(thread) {
  return threadFilePath(thread).startsWith(".cursor/plans/")
}

function isProcessMetaThread(thread) {
  // Work-order `.cursor/plans/` paths and outdated leftovers are process-meta (G-CR3).
  return isWorkOrderPlanThread(thread) || thread?.isOutdated === true
}

function resolvedProductThreads(threads) {
  return threads.filter(
    (thread) =>
      thread?.isResolved === true &&
      threadHasCodeRabbit(thread) &&
      !isProcessMetaThread(thread),
  )
}

function isCompletedSuccess(state) {
  return String(state || "").toLowerCase() === "success"
}

function isUsCompletedLegacyStatus(status) {
  const login = status?.creator?.login
  return (
    status?.context === REQUIRED_US_STATUS_CONTEXT &&
    isCompletedSuccess(status?.state) &&
    (login == null || login === "" || isUsBotLogin(login))
  )
}

function isUsCompletedCheck(run) {
  // GitHub check-suites from App 347564 often have an empty name and
  // put the CodeRabbit label on app.name (G-CR3).
  const label = run?.name || run?.app?.name
  return (
    isCodeRabbitShaped(label) &&
    isCompletedSuccess(run?.conclusion || run?.status) &&
    isUsApp(run)
  )
}

export function hasUsCompletedHeadStatus(snapshot) {
  const statuses = snapshot?.statuses || snapshot?.status?.statuses || []
  const runs = [
    ...(snapshot?.checkRuns || snapshot?.check_runs || []),
    ...(snapshot?.checkSuites || snapshot?.check_suites || []),
  ]
  return (
    statuses.some(isUsCompletedLegacyStatus) || runs.some(isUsCompletedCheck)
  )
}

function captureRoutedFindings(snapshot) {
  return collectActiveCodeRabbitFindings(snapshot).map((finding) => ({
    ...finding,
    route: "capture",
    command: "/capture",
  }))
}

export function collectOverrideTexts(snapshot) {
  const blobs = []
  for (const c of snapshot.issueComments || []) blobs.push(c.body)
  for (const c of snapshot.reviewComments || []) blobs.push(c.body)
  for (const r of snapshot.reviews || []) blobs.push(r.body)
  return blobs.filter(Boolean)
}

export function parseCodeRabbitSeverity(body) {
  const header = String(body || "").split(/\r?\n/, 1)[0]
  const match = header.match(
    /\|\s*_[^_\r\n]*?(Critical|Major|Minor|Trivial)[^_\r\n]*_/i,
  )
  return match ? match[1].toLowerCase() : null
}

export function parseCodeRabbitTitle(body) {
  const match = String(body || "").match(/\*\*([^*\r\n]+)\*\*/)
  return match ? match[1].trim().slice(0, 200) : "CodeRabbit finding"
}

export function codeRabbitFindingId(comment, thread = {}) {
  const body = String(comment?.body || "")
  const tagged = body.match(/<!--\s*cr-comment:v1:([^\s>]+)\s*-->/i)
  if (tagged) return `cr-comment:v1:${tagged[1]}`
  const providerId =
    comment?.databaseId || comment?.id || thread?.databaseId || thread?.id || ""
  return providerId ? `github:${providerId}` : "unidentified"
}

export const LOOP_ROUND_CAP = 3
export const PUSH_CLI_FIX_ROUND_CAP = 1

const IN_PROGRESS_CHECK_STATES = new Set([
  "queued",
  "in_progress",
  "pending",
  "waiting",
  "requested",
])

const IN_PROGRESS_STATUS_STATES = new Set(["pending", "queued"])

const IN_PROGRESS_COMMENT_RE =
  /review\s+in\s+progress|currently\s+reviewing|\bis\s+reviewing\b|generating (?:your |a )?review|review is (?:being )?generated/i

export function checkLooksInProgress(run) {
  const conclusion = String(run?.conclusion || "").toLowerCase()
  if (conclusion && conclusion !== "null") return false
  return IN_PROGRESS_CHECK_STATES.has(String(run?.status || "").toLowerCase())
}

function isCodeRabbitCheck(run) {
  const label = run?.name || run?.app?.name
  return isCodeRabbitShaped(label) || isCodeRabbitShaped(checkAppSlug(run))
}

export function statusLooksInProgress(status) {
  const state = String(status?.state || "").toLowerCase()
  if (!IN_PROGRESS_STATUS_STATES.has(state)) return false
  const context = status?.context || ""
  return context === REQUIRED_US_STATUS_CONTEXT || isCodeRabbitShaped(context)
}

function commentMentionsHead(comment, headSha) {
  const body = String(comment?.body || "")
  const commentSha =
    comment?.commit_id || comment?.commitId || comment?.commit?.oid || ""
  if (commentSha && headSha && commentSha === headSha) return true
  if (!headSha) return !/\b[0-9a-f]{7,40}\b/i.test(body)
  const sha = String(headSha)
  if (body.toLowerCase().includes(sha.toLowerCase())) return true
  if (sha.length >= 7) {
    const short = sha.slice(0, 7).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    if (new RegExp(`\\b${short}\\b`, "i").test(body)) return true
  }
  return !/\b[0-9a-f]{7,40}\b/i.test(body)
}

export function commentLooksReviewInProgress(comment, headSha) {
  const login = commentAuthorLogin(comment)
  if (!isUsBotLogin(login) && !isCodeRabbitShaped(login)) return false
  if (!IN_PROGRESS_COMMENT_RE.test(String(comment?.body || ""))) return false
  return commentMentionsHead(comment, headSha)
}

export function hasCodeRabbitReviewInProgress(snapshot) {
  const headSha = String(
    snapshot?.headSha ||
      snapshot?.pull?.headSha ||
      snapshot?.pull?.head?.sha ||
      "",
  )
  const runs = [
    ...(snapshot?.checkRuns || snapshot?.check_runs || []),
    ...(snapshot?.checkSuites || snapshot?.check_suites || []),
  ]
  if (runs.some((run) => isCodeRabbitCheck(run) && checkLooksInProgress(run))) {
    return true
  }
  const statuses = snapshot?.statuses || snapshot?.status?.statuses || []
  if (statuses.some(statusLooksInProgress)) return true
  const comments = [
    ...(snapshot?.issueComments || []),
    ...(snapshot?.reviewComments || []),
  ]
  return comments.some((comment) =>
    commentLooksReviewInProgress(comment, headSha),
  )
}

export function decidePushCliAction({
  attemptStatus,
  findings = [],
  priorRound = 0,
} = {}) {
  if (attemptStatus === "unavailable" || attemptStatus === "clean") {
    return {
      action: "push",
      leftover: attemptStatus === "clean" ? [] : findings,
      record: attemptStatus,
    }
  }
  const routed = (findings || []).map((finding) => ({
    ...finding,
    ...classifyFindingRouting(finding),
  }))
  if (priorRound >= PUSH_CLI_FIX_ROUND_CAP) {
    return {
      action: "push",
      leftover: routed,
      record: "leftover_after_fix_round",
    }
  }
  return {
    action: "route",
    leftover: routed,
    sddToTdd: routed.filter((finding) => finding.route === "sdd-to-tdd"),
    capture: routed.filter((finding) => finding.route === "capture"),
    record: "fix_round",
  }
}

export const NO_FORMAL_REVIEW_OPERATOR_COMMENT =
  "No formal CodeRabbit review ran on this head. The draft is marked ready. Comment `@coderabbitai full review` if you want a review, or merge without one."

export const NO_FORMAL_REVIEW_BODY_HEADING = "## CodeRabbit note"

export function resolveOperatorNotePlacement({
  commentPosted = false,
  commentStatus = null,
  commentError = "",
} = {}) {
  if (commentPosted === true) {
    return { fatal: false, ready: true, recordIn: ["issue_comment"] }
  }
  const status = Number(commentStatus)
  const errorText = String(commentError || "")
  const is403 =
    status === 403 ||
    /\b403\b/.test(errorText) ||
    /Resource not accessible by integration/i.test(errorText)
  if (is403) {
    return {
      fatal: false,
      ready: true,
      recordIn: ["pr_body", "report"],
      log: "operator comment failed with 403 (GitHub App token lacks issues: write); recording the note on the PR body and in the agent report",
    }
  }
  const statusPart =
    commentStatus == null || commentStatus === "" || !Number.isFinite(status)
      ? ""
      : ` with ${status}`
  return {
    fatal: false,
    ready: true,
    recordIn: ["report"],
    log: `operator comment failed${statusPart}; recording the note in the agent report`,
  }
}

export function appendOperatorNoteToPrBody(existingBody, note) {
  const body = String(existingBody || "").trimEnd()
  const text = String(note || "").trim()
  const block = text
    ? `${NO_FORMAL_REVIEW_BODY_HEADING}\n\n${text}`
    : NO_FORMAL_REVIEW_BODY_HEADING
  if (
    (text && body.includes(text)) ||
    body.includes(NO_FORMAL_REVIEW_BODY_HEADING)
  ) {
    return body || block
  }
  return body ? `${body}\n\n${block}` : block
}

const QUIET_WALKTHROUGH_MARKERS = [
  /auto-generated comment:\s*summarize by coderabbit\.ai/i,
  /<!--\s*walkthrough_start\s*-->/i,
  /<!--\s*walkthrough_end\s*-->/i,
  /^##\s+Walkthrough\b/m,
  /^walkthrough$/i,
]

export function actionableCommentsPosted(body) {
  const match = String(body || "").match(/Actionable comments posted:\s*(\d+)/i)
  return match ? Number(match[1]) : null
}

export function isQuietModeWalkthroughBody(body) {
  const text = String(body || "")
  if (!text.trim()) return false
  if (!QUIET_WALKTHROUGH_MARKERS.some((re) => re.test(text))) return false
  const posted = actionableCommentsPosted(text)
  if (posted != null && posted > 0) return false
  return !parseCodeRabbitSeverity(text)
}

export function reviewBodyHasActionableFindings(body) {
  const text = String(body || "")
  if (!text.trim() || isQuietModeWalkthroughBody(text)) return false
  if (parseCodeRabbitSeverity(text)) return true
  const posted = actionableCommentsPosted(text)
  return posted != null && posted > 0
}

function collectCommentedReviewBodyFindings(
  snapshot,
  headSha,
  { loop = false } = {},
) {
  const findings = []
  for (const review of snapshot?.reviews || []) {
    if (!isUsBotLogin(reviewAuthorLogin(review))) continue
    if (reviewCommitId(review) !== headSha) continue
    if (reviewState(review) !== "COMMENTED") continue
    const body = String(review.body || "")
    if (!reviewBodyHasActionableFindings(body)) continue
    const severity = parseCodeRabbitSeverity(body)
    const id = codeRabbitFindingId(
      {
        body,
        id: review.id || review.node_id,
        databaseId: review.id,
      },
      {},
    )
    const routing = classifyFindingRouting({ severity, body }, { loop })
    findings.push({
      id,
      path: "",
      title: parseCodeRabbitTitle(body),
      ...routing,
      route: "capture",
      command: "/capture",
    })
  }
  return findings
}

function readyMetadata(headSha, isDraft, extra = {}) {
  return {
    headSha,
    isDraft,
    usAppId: US_APP_ID,
    checkName: US_LATEST_HEAD_CHECK_NAME,
    statusContext: REQUIRED_US_STATUS_CONTEXT,
    ...extra,
  }
}

export function countCodeRabbitReviewedHeads(snapshot) {
  const heads = new Set()
  for (const review of snapshot?.reviews || []) {
    if (!isUsBotLogin(reviewAuthorLogin(review))) continue
    const sha = reviewCommitId(review)
    if (sha) heads.add(sha)
  }
  return heads.size
}

function loopRouting(finding) {
  const severity = String(
    finding?.severity || parseCodeRabbitSeverity(finding?.body) || "",
  ).toLowerCase()
  const levels = {
    critical: "blocker",
    major: "high",
    minor: "medium",
    trivial: "low",
  }
  const known = CODERABBIT_PR_SEVERITIES.includes(severity)
  const fix = severity === "critical" || !known
  return {
    severity: known ? severity : "unknown",
    level: levels[severity] || "blocker",
    route: fix ? "sdd-to-tdd" : "capture",
    command: fix ? "/sdd-to-tdd" : "/capture",
  }
}

export function classifyFindingRouting(
  finding,
  { inScopePaths = [], loop = false } = {},
) {
  if (loop) return loopRouting(finding)
  const file = String(finding.fileName || finding.file || "")
  if (finding.inScope === true) {
    return { route: "sdd-to-tdd", command: "/sdd-to-tdd" }
  }
  if (inScopePaths.length > 0) {
    const inScope = inScopePaths.some(
      (p) => file === p || file.startsWith(`${p}/`) || p.startsWith(file),
    )
    return inScope
      ? { route: "sdd-to-tdd", command: "/sdd-to-tdd" }
      : { route: "capture", command: "/capture" }
  }

  const severity = String(
    finding?.severity || parseCodeRabbitSeverity(finding?.body) || "",
  ).toLowerCase()
  const levels = {
    critical: "blocker",
    major: "high",
    minor: "medium",
    trivial: "low",
  }
  const known = CODERABBIT_PR_SEVERITIES.includes(severity)
  const high = severity === "critical" || severity === "major" || !known
  return {
    severity: known ? severity : "unknown",
    level: levels[severity] || "blocker",
    route: high ? "sdd-to-tdd" : "capture",
    command: high ? "/sdd-to-tdd" : "/capture",
  }
}

export function collectActiveCodeRabbitFindings(
  snapshot,
  { loop = false } = {},
) {
  const findings = new Map()
  for (const thread of snapshot?.threads || snapshot?.reviewThreads || []) {
    if (thread?.isResolved === true || !threadHasCodeRabbit(thread)) continue
    if (isProcessMetaThread(thread)) continue
    const comments = threadComments(thread)
    for (const comment of comments) {
      const login = commentAuthorLogin(comment)
      if (!isUsBotLogin(login)) continue
      const body = String(comment?.body || "")
      const severity = parseCodeRabbitSeverity(body)
      const id = codeRabbitFindingId(comment, thread)
      if (!severity && id === "unidentified") continue
      const routing = classifyFindingRouting({ severity, body }, { loop })
      findings.set(id, {
        id,
        path: comment?.path || thread?.path || "",
        title: parseCodeRabbitTitle(body),
        ...routing,
      })
    }
  }
  return [...findings.values()]
}

function isNonEmptyTrimmedString(value) {
  return typeof value === "string" && value.trim() !== ""
}

// Adapter-enforced G-CR3 shapes. Keep out of evaluateReadyPr so
// policy snapshots stay shape-agnostic.
export function isAllowedReadyPrShape(base, head) {
  return (
    isNonEmptyTrimmedString(base) &&
    isNonEmptyTrimmedString(head) &&
    ((base === "staging" && head !== "staging" && head !== "main") ||
      (head === "staging" && base === "main"))
  )
}

function withLoopMeta(result, snapshot, loop) {
  if (!loop) return result
  return {
    ...result,
    roundsUsed: countCodeRabbitReviewedHeads(snapshot),
    roundCap: LOOP_ROUND_CAP,
  }
}

function evaluateReadyPrCore(
  snapshot,
  { allowDraft = false, loop = false } = {},
) {
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, reason: "malformed_snapshot" }
  }
  const isDraft = snapshot.isDraft === true || snapshot.pull?.isDraft === true
  if (isDraft && !allowDraft) {
    return { ok: false, reason: "draft" }
  }
  const headSha = String(
    snapshot.headSha ||
      snapshot.pull?.headSha ||
      snapshot.pull?.head?.sha ||
      "",
  )
  if (!headSha) return { ok: false, reason: "missing_head" }

  const reviews = snapshot.reviews || []
  const checkRuns = snapshot.checkRuns || snapshot.check_runs || []
  const checkSuites = snapshot.checkSuites || snapshot.check_suites || []
  const issueComments = snapshot.issueComments || []
  const reviewComments = snapshot.reviewComments || []

  // Reviews, checks, issue/inline comment authors: wrong_bot before
  // rate/billing/unresolved routing.
  if (
    reviews.some((r) => isNonUsCodeRabbitLogin(reviewAuthorLogin(r))) ||
    [...checkRuns, ...checkSuites].some(isNonUsCodeRabbitApp) ||
    [...issueComments, ...reviewComments].some((c) =>
      isNonUsCodeRabbitLogin(commentAuthorLogin(c)),
    )
  ) {
    return { ok: false, reason: "wrong_bot" }
  }

  for (const run of checkRuns) {
    const blob = `${run.name || ""} ${run.output?.title || ""} ${run.output?.summary || ""} ${run.output?.text || ""}`
    const synthetic = {
      type: "status",
      status: run.conclusion || run.status,
      message: blob,
      name: run.name,
    }
    if (
      eventLooksRateLimited(synthetic) ||
      RATE_NAME(run.name) ||
      RATE_NAME(blob)
    ) {
      return { ok: false, reason: "rate_limited" }
    }
    if (eventLooksBilling(synthetic) || BILL_NAME(blob)) {
      return { ok: false, reason: "billing" }
    }
  }

  const overrideText = collectOverrideTexts(snapshot).find(
    containsOverrideMarker,
  )
  if (overrideText) {
    return { ok: false, reason: "explicit_override" }
  }

  const threads = snapshot.threads || snapshot.reviewThreads || []
  // Non-US thread identity is wrong_bot before US-bot unresolved routing.
  if (threads.some(threadHasNonUsCodeRabbit)) {
    return { ok: false, reason: "wrong_bot" }
  }

  const usReviews = reviews.filter((r) => isUsBotLogin(reviewAuthorLogin(r)))
  const onHead = usReviews.filter((r) => reviewCommitId(r) === headSha)
  const ranked = onHead.filter((r) =>
    ["APPROVED", "CHANGES_REQUESTED"].includes(reviewState(r)),
  )
  const incrementalPaused =
    ranked.length === 0 &&
    usReviews.length > 0 &&
    hasUsCompletedHeadStatus(snapshot)

  const unresolved = threads.filter(
    (t) =>
      t.isResolved !== true &&
      threadHasCodeRabbit(t) &&
      !isProcessMetaThread(t),
  )
  if (unresolved.length && !incrementalPaused) {
    return {
      ok: false,
      reason: "unresolved_threads",
      unresolvedThreadCount: unresolved.length,
      findings: collectActiveCodeRabbitFindings(snapshot, { loop }),
    }
  }

  if (!ranked.length) {
    const otherApproval = reviews.find(
      (r) =>
        reviewState(r) === "APPROVED" && !isUsBotLogin(reviewAuthorLogin(r)),
    )
    if (!usReviews.length && otherApproval) {
      return { ok: false, reason: "wrong_bot" }
    }
    if (incrementalPaused) {
      return {
        ok: true,
        reason: "incremental_paused",
        ...readyMetadata(headSha, isDraft, {
          findings: captureRoutedFindings(snapshot),
        }),
      }
    }
    const commentedFindings = collectCommentedReviewBodyFindings(
      snapshot,
      headSha,
      { loop },
    )
    if (commentedFindings.length) {
      return {
        ok: false,
        reason: "commented_review_findings",
        findings: commentedFindings,
      }
    }
    const formalElsewhere = usReviews.some((review) =>
      ["APPROVED", "CHANGES_REQUESTED"].includes(reviewState(review)),
    )
    if (formalElsewhere) {
      return { ok: false, reason: "stale_approval" }
    }
    if (hasCodeRabbitReviewInProgress(snapshot)) {
      return {
        ok: false,
        reason: "review_in_progress",
        ...readyMetadata(headSha, isDraft),
      }
    }
    return {
      ok: true,
      reason: "ready_no_coderabbit_review",
      operatorComment: NO_FORMAL_REVIEW_OPERATOR_COMMENT,
      ...readyMetadata(headSha, isDraft),
    }
  }
  const latest = ranked[ranked.length - 1]
  if (reviewState(latest) !== "APPROVED") {
    // G-CR4: ledgered capture threads are resolved before this re-run.
    if (
      loop &&
      reviewState(latest) === "CHANGES_REQUESTED" &&
      resolvedProductThreads(threads).length > 0
    ) {
      return {
        ok: true,
        reason: "captured_threads_resolved",
        ...readyMetadata(headSha, isDraft, {
          commitId: reviewCommitId(latest),
        }),
      }
    }
    if (
      reviewState(latest) === "CHANGES_REQUESTED" &&
      isQuietModeWalkthroughBody(latest.body)
    ) {
      return {
        ok: true,
        reason: "changes_requested_meta_only",
        ...readyMetadata(headSha, isDraft, {
          commitId: reviewCommitId(latest),
        }),
      }
    }
    return {
      ok: false,
      reason:
        reviewState(latest) === "CHANGES_REQUESTED"
          ? "changes_requested"
          : "pending",
      state: reviewState(latest),
    }
  }

  return {
    ok: true,
    reason: "clean",
    ...readyMetadata(headSha, isDraft, {
      commitId: reviewCommitId(latest),
    }),
  }
}

export function evaluateReadyPr(snapshot, options = {}) {
  return withLoopMeta(
    evaluateReadyPrCore(snapshot, options),
    snapshot,
    options.loop === true,
  )
}

function RATE_NAME(text) {
  return /rate[\s_-]*limit/i.test(String(text || ""))
}

function BILL_NAME(text) {
  return /billing|usage[-\s]?credit/i.test(String(text || ""))
}

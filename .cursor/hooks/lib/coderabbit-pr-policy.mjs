/**
 * Pure ready-PR CodeRabbit policy. US latest-head approval, no EU activity,
 * no unresolved CodeRabbit threads, no rate-limit/billing/override markers.
 */
import {
  EU_APP_ID,
  US_APP_ID,
  containsOverrideMarker,
  eventLooksBilling,
  eventLooksRateLimited,
  isEuBotLogin,
  isUsBotLogin,
} from "./coderabbit-review-policy.mjs"

export { EU_APP_ID, US_APP_ID }

export const US_LATEST_HEAD_CHECK_NAME = "CodeRabbit US latest-head gate"
export const REQUIRED_US_STATUS_CONTEXT = "CodeRabbit"

export function reviewAuthorLogin(review) {
  return (
    review?.user?.login ||
    review?.author?.login ||
    review?.user ||
    ""
  )
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

export function isEuApp(run) {
  const id = checkAppId(run)
  if (id === EU_APP_ID) return true
  const slug = checkAppSlug(run)
  return slug.includes("coderabbiteu")
}

export function isUsApp(run) {
  const id = checkAppId(run)
  if (id === US_APP_ID) return true
  const slug = checkAppSlug(run)
  return slug === "coderabbitai" || slug === "coderabbit"
}

export function threadHasCodeRabbit(thread) {
  const comments =
    thread?.comments?.nodes ||
    thread?.comments ||
    thread?.commentNodes ||
    []
  return comments.some((c) => {
    const login = c?.author?.login || c?.user?.login || ""
    return isUsBotLogin(login) || isEuBotLogin(login)
  })
}

export function collectOverrideTexts(snapshot) {
  const blobs = []
  for (const c of snapshot.issueComments || []) blobs.push(c.body)
  for (const c of snapshot.reviewComments || []) blobs.push(c.body)
  for (const r of snapshot.reviews || []) blobs.push(r.body)
  return blobs.filter(Boolean)
}

export function evaluateReadyPr(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, reason: "malformed_snapshot" }
  }
  if (snapshot.isDraft === true || snapshot.pull?.isDraft === true) {
    return { ok: false, reason: "draft" }
  }
  const headSha = String(
    snapshot.headSha || snapshot.pull?.headSha || snapshot.pull?.head?.sha || "",
  )
  if (!headSha) return { ok: false, reason: "missing_head" }

  const reviews = snapshot.reviews || []
  const checkRuns = snapshot.checkRuns || snapshot.check_runs || []
  const checkSuites = snapshot.checkSuites || snapshot.check_suites || []

  const euReview = reviews.find((r) => isEuBotLogin(reviewAuthorLogin(r)))
  const euRun = [...checkRuns, ...checkSuites].find(isEuApp)
  if (euReview || euRun) {
    return { ok: false, reason: "eu_bot_activity" }
  }

  for (const run of checkRuns) {
    const blob = `${run.name || ""} ${run.output?.title || ""} ${run.output?.summary || ""} ${run.output?.text || ""}`
    const synthetic = {
      type: "status",
      status: run.conclusion || run.status,
      message: blob,
      name: run.name,
    }
    if (eventLooksRateLimited(synthetic) || RATE_NAME(run.name) || RATE_NAME(blob)) {
      return { ok: false, reason: "rate_limited" }
    }
    if (eventLooksBilling(synthetic) || BILL_NAME(blob)) {
      return { ok: false, reason: "billing" }
    }
  }

  const overrideText = collectOverrideTexts(snapshot).find(containsOverrideMarker)
  if (overrideText) {
    return { ok: false, reason: "explicit_override" }
  }

  const threads = snapshot.threads || snapshot.reviewThreads || []
  const unresolved = threads.filter((t) => {
    if (t.isResolved === true) return false
    return threadHasCodeRabbit(t)
  })
  if (unresolved.length) {
    return { ok: false, reason: "unresolved_threads", threads: unresolved }
  }

  const usReviews = reviews.filter((r) => isUsBotLogin(reviewAuthorLogin(r)))
  const onHead = usReviews.filter((r) => reviewCommitId(r) === headSha)
  const ranked = onHead.filter((r) =>
    ["APPROVED", "CHANGES_REQUESTED"].includes(reviewState(r)),
  )
  if (!ranked.length) {
    const otherApproval = reviews.find(
      (r) =>
        reviewState(r) === "APPROVED" &&
        !isUsBotLogin(reviewAuthorLogin(r)) &&
        !isEuBotLogin(reviewAuthorLogin(r)),
    )
    if (!usReviews.length && otherApproval) {
      return { ok: false, reason: "wrong_bot" }
    }
    return {
      ok: false,
      reason: usReviews.length > 0 ? "stale_approval" : "pending",
    }
  }
  const latest = ranked[ranked.length - 1]
  if (reviewState(latest) !== "APPROVED") {
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
    headSha,
    commitId: reviewCommitId(latest),
    usAppId: US_APP_ID,
    checkName: US_LATEST_HEAD_CHECK_NAME,
    statusContext: REQUIRED_US_STATUS_CONTEXT,
  }
}

function RATE_NAME(text) {
  return /rate[\s_-]*limit/i.test(String(text || ""))
}

function BILL_NAME(text) {
  return /billing|usage[-\s]?credit/i.test(String(text || ""))
}

export function classifyFindingRouting(finding, { inScopePaths = [] } = {}) {
  const file = String(finding.fileName || finding.file || "")
  const inScope = inScopePaths.some(
    (p) => file === p || file.startsWith(`${p}/`) || p.startsWith(file),
  )
  if (inScope || finding.inScope === true) {
    return { route: "sdd-to-tdd", command: "/sdd-to-tdd" }
  }
  return { route: "capture", command: "/capture" }
}

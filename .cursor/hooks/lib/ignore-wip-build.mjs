import { spawnSync } from "node:child_process"
import { shouldIgnoreWipBuild } from "./gate-evidence-policy.mjs"

const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? ""
const title = resolvePrTitle() || commitMessage

process.exit(
  shouldIgnoreWipBuild({
    title,
    commitMessage,
    env: process.env.VERCEL_ENV,
    branch: process.env.VERCEL_GIT_COMMIT_REF,
  })
    ? 0
    : 1,
)

function resolvePrTitle() {
  const fromEnv = process.env.VERCEL_GIT_PULL_REQUEST_TITLE
  if (fromEnv) return fromEnv
  const id = process.env.VERCEL_GIT_PULL_REQUEST_ID
  const owner = process.env.VERCEL_GIT_REPO_OWNER
  const repo = process.env.VERCEL_GIT_REPO_SLUG
  if (!id || !owner || !repo) return ""
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${id}`
  // Unauthenticated lookup 404s on private repos and then falls back.
  const result = spawnSync(
    "curl",
    [
      "-fsS",
      "--max-time",
      "10",
      "-H",
      "Accept: application/vnd.github+json",
      url,
    ],
    { encoding: "utf8", timeout: 15_000 },
  )
  if (result.status !== 0) return ""
  try {
    const parsed = JSON.parse(result.stdout)
    return typeof parsed.title === "string" ? parsed.title : ""
  } catch {
    return ""
  }
}

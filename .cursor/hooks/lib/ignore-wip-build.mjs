import { shouldIgnoreWipBuild } from "./gate-evidence-policy.mjs"

const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? ""

process.exit(
  shouldIgnoreWipBuild({
    title: commitMessage,
    commitMessage,
    env: process.env.VERCEL_ENV,
    branch: process.env.VERCEL_GIT_COMMIT_REF,
  })
    ? 0
    : 1,
)

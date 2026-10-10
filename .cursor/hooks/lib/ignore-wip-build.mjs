import { shouldIgnoreWipBuild } from "./gate-evidence-policy.mjs"

const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? ""

process.exit(
  shouldIgnoreWipBuild({ title: commitMessage, commitMessage }) ? 0 : 1,
)

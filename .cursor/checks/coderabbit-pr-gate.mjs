#!/usr/bin/env node
/**
 * Read-only GitHub adapter for the US latest-head CodeRabbit gate.
 * Never comments, writes Linear, readies, commits, pushes, or merges.
 *
 * Usage:
 *   node .cursor/checks/coderabbit-pr-gate.mjs
 *   node .cursor/checks/coderabbit-pr-gate.mjs --owner o --repo r --pr 12
 *   node .cursor/checks/coderabbit-pr-gate.mjs --snapshot path.json
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { evaluateReadyPr } from "../hooks/lib/coderabbit-pr-policy.mjs"

function argValue(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function fail(reason, extra = {}) {
  console.error(JSON.stringify({ ok: false, reason, ...extra }, null, 2))
  process.exit(1)
}

function loadEvent() {
  const path = process.env.GITHUB_EVENT_PATH
  if (!path || !existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}

function repoFromEnv() {
  const full = process.env.GITHUB_REPOSITORY || ""
  const [owner, repo] = full.split("/")
  return { owner, repo }
}

async function ghJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "restaurant-system-coderabbit-pr-gate",
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${url}: ${text}`)
  }
  return res.json()
}

async function ghGraphql(token, query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "restaurant-system-coderabbit-pr-gate",
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json()
  if (!res.ok || body.errors) {
    throw new Error(JSON.stringify(body.errors || body))
  }
  return body.data
}

const THREADS_QUERY = `
query ($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage }
        nodes {
          isResolved
          isOutdated
          comments(first: 20) {
            nodes { author { login } body }
          }
        }
      }
    }
  }
}
`

async function fetchSnapshot({ owner, repo, number, token }) {
  const pull = await ghJson(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    token,
  )
  const headSha = pull.head?.sha
  const [reviews, issueComments, reviewComments, checkRuns] =
    await Promise.all([
      ghJson(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
        token,
      ),
      ghJson(
        `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`,
        token,
      ),
      ghJson(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/comments`,
        token,
      ),
      headSha
        ? ghJson(
            `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs`,
            token,
          )
        : { check_runs: [] },
    ])
  const data = await ghGraphql(token, THREADS_QUERY, {
    owner,
    name: repo,
    number,
  })
  const threads =
    data?.repository?.pullRequest?.reviewThreads?.nodes || []
  return {
    isDraft: pull.draft === true,
    pull: {
      number: pull.number,
      isDraft: pull.draft === true,
      base: pull.base?.ref,
      head: pull.head?.ref,
      headSha,
    },
    headSha,
    reviews,
    issueComments,
    reviewComments,
    checkRuns: checkRuns.check_runs || checkRuns,
    threads,
  }
}

async function main() {
  const snapshotPath = argValue("--snapshot")
  const promotionOnly =
    process.argv.includes("--promotion-only") ||
    process.env.CODERABBIT_PR_PROMOTION_ONLY === "1"

  if (snapshotPath) {
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"))
    if (promotionOnly) {
      const base = snapshot.pull?.base
      const head = snapshot.pull?.head
      if (base !== "main" || head !== "staging") {
        fail("wrong_base_head", { base, head })
      }
    }
    const result = evaluateReadyPr(snapshot)
    if (!result.ok) fail(result.reason, result)
    console.log(JSON.stringify({ ok: true, ...result }, null, 2))
    return
  }

  const event = loadEvent()
  const fromEnv = repoFromEnv()
  const owner = argValue("--owner") || fromEnv.owner
  const repo = argValue("--repo") || fromEnv.repo
  const number = Number(
    argValue("--pr") ||
      event?.pull_request?.number ||
      event?.number ||
      0,
  )
  if (!owner || !repo || !number) fail("missing_pr")

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) fail("missing_token")
  const snapshot = await fetchSnapshot({ owner, repo, number, token })
  if (promotionOnly) {
    if (
      snapshot.pull.base !== "main" ||
      snapshot.pull.head !== "staging"
    ) {
      fail("wrong_base_head", {
        base: snapshot.pull.base,
        head: snapshot.pull.head,
      })
    }
  }
  const result = evaluateReadyPr(snapshot)
  if (!result.ok) fail(result.reason, result)
  console.log(JSON.stringify({ ok: true, ...result }, null, 2))
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((err) => fail("error", { message: err.message }))
}

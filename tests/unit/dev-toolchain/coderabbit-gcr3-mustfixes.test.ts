import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { detectCoderabbitYamlViolations } from "../../../.cursor/checks/harness-lint.mjs"
import { evaluateReadyPr } from "../../../.cursor/hooks/lib/coderabbit-pr-policy.mjs"

const repoRoot = process.cwd()

function stripHashAndLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) =>
      line
        .replace(/(^|[^:])\/\/.*$/, "$1")
        .replace(/(^|[^"'`])#(?!\{).*$/, "$1"),
    )
    .join("\n")
}

function extractFetchSnapshot(source: string): string {
  const marker = "async function fetchSnapshot"
  const start = source.indexOf(marker)
  if (start === -1) {
    return ""
  }
  const fromFn = source.slice(start)
  const next = fromFn.slice(marker.length).search(/\nasync function /)
  if (next === -1) {
    return fromFn
  }
  return fromFn.slice(0, marker.length + next)
}

function sourceAfterPromiseAll(fnSource: string): string {
  const callAt = fnSource.indexOf("Promise.all")
  if (callAt === -1) {
    return ""
  }
  const openParen = fnSource.indexOf("(", callAt)
  if (openParen === -1) {
    return ""
  }
  let depth = 0
  for (let i = openParen; i < fnSource.length; i += 1) {
    if (fnSource[i] === "(") {
      depth += 1
    } else if (fnSource[i] === ")") {
      depth -= 1
      if (depth === 0) {
        return fnSource.slice(i + 1)
      }
    }
  }
  return ""
}

describe("G-CR3 snapshot HEAD re-read", () => {
  it("fetchSnapshot fails head_changed when the PR SHA moves during pagination", () => {
    const source = readFileSync(
      path.join(repoRoot, ".cursor", "checks", "coderabbit-pr-gate.mjs"),
      "utf8",
    )
    const fetchSnapshot = stripHashAndLineComments(extractFetchSnapshot(source))
    const afterPagination = sourceAfterPromiseAll(fetchSnapshot)

    expect({
      rereadsPullAfterPagination: /\/pulls\/\$\{number\}(?!\/)/.test(
        afterPagination,
      ),
      comparesCollectedHeadSha:
        /head\??\.sha[\s\S]*?(?:!==|!=)[\s\S]*?headSha|headSha[\s\S]*?(?:!==|!=)[\s\S]*?head\??\.sha/.test(
          afterPagination,
        ),
      failsHeadChanged: /["']head_changed["']/.test(afterPagination),
    }).toEqual({
      rereadsPullAfterPagination: true,
      comparesCollectedHeadSha: true,
      failsHeadChanged: true,
    })
  })

  it("fetchSnapshot fails head_changed when the PR SHA moves during pagination", async () => {
    const originalFetch = globalThis.fetch
    let pullGets = 0
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input)
      const pathname = new URL(url).pathname
      const json = (body: unknown) => ({
        ok: true,
        json: async () => body,
        text: async () => JSON.stringify(body),
      })

      if (pathname === "/graphql") {
        return json({
          data: {
            repository: {
              pullRequest: {
                reviewThreads: {
                  nodes: [],
                  pageInfo: { hasNextPage: false },
                },
              },
            },
          },
        })
      }

      if (pathname.endsWith("/reviews") || pathname.endsWith("/comments")) {
        return json([])
      }

      if (pathname.endsWith("/commits/sha-a/check-runs")) {
        return json({ check_runs: [] })
      }

      if (pathname.endsWith("/commits/sha-a/check-suites")) {
        return json({ check_suites: [] })
      }

      if (/\/pulls\/\d+$/.test(pathname)) {
        pullGets += 1
        if (pullGets === 1) {
          return json({
            number: 12,
            draft: false,
            base: { ref: "staging" },
            head: { sha: "sha-a", ref: "feat" },
          })
        }
        return json({ head: { sha: "sha-b" } })
      }

      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    try {
      const { fetchSnapshot } =
        await import("../../../.cursor/checks/coderabbit-pr-gate.mjs")
      let thrown: unknown
      try {
        await fetchSnapshot({
          owner: "acme",
          repo: "restaurant-system",
          number: 12,
          token: "test-token",
        })
      } catch (error) {
        thrown = error
      }
      expect((thrown as { message?: string })?.message).toBe("head_changed")
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it("fetchSnapshot fails pull_changed when base ref head ref or draft moves with sha unchanged", async () => {
    const originalFetch = globalThis.fetch
    const initialPull = {
      number: 12,
      draft: false,
      base: { ref: "staging" },
      head: { sha: "sha-a", ref: "feat" },
    }
    const { fetchSnapshot } =
      await import("../../../.cursor/checks/coderabbit-pr-gate.mjs")

    async function expectPullChanged(secondPull: {
      number: number
      draft: boolean
      base: { ref: string }
      head: { sha: string; ref: string }
    }) {
      let pullGets = 0
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
        const url = String(input)
        const pathname = new URL(url).pathname
        const json = (body: unknown) => ({
          ok: true,
          json: async () => body,
          text: async () => JSON.stringify(body),
        })

        if (pathname === "/graphql") {
          return json({
            data: {
              repository: {
                pullRequest: {
                  reviewThreads: {
                    nodes: [],
                    pageInfo: { hasNextPage: false },
                  },
                },
              },
            },
          })
        }

        if (pathname.endsWith("/reviews") || pathname.endsWith("/comments")) {
          return json([])
        }

        if (pathname.endsWith("/commits/sha-a/check-runs")) {
          return json({ check_runs: [] })
        }

        if (pathname.endsWith("/commits/sha-a/check-suites")) {
          return json({ check_suites: [] })
        }

        if (/\/pulls\/\d+$/.test(pathname)) {
          pullGets += 1
          if (pullGets === 1) {
            return json(initialPull)
          }
          return json(secondPull)
        }

        throw new Error(`unexpected fetch: ${url}`)
      }) as typeof fetch

      let thrown: unknown
      try {
        await fetchSnapshot({
          owner: "acme",
          repo: "restaurant-system",
          number: 12,
          token: "test-token",
        })
      } catch (error) {
        thrown = error
      }
      expect((thrown as { message?: string })?.message).toBe("pull_changed")
    }

    try {
      await expectPullChanged({
        ...initialPull,
        base: { ref: "main" },
      })
      await expectPullChanged({
        ...initialPull,
        head: { sha: "sha-a", ref: "other" },
      })
      await expectPullChanged({
        ...initialPull,
        draft: true,
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe("G-CR3 adapter branch shapes", () => {
  it("adapter rejects main into staging with wrong_base_head", () => {
    const adapter = path.join(
      repoRoot,
      ".cursor",
      "checks",
      "coderabbit-pr-gate.mjs",
    )
    const fixture = path.join(
      repoRoot,
      "tests",
      "unit",
      "dev-toolchain",
      "fixtures",
      "remote-main-into-staging.json",
    )
    const result = spawnSync(
      process.execPath,
      [adapter, "--snapshot", fixture],
      {
        encoding: "utf8",
      },
    )

    expect(result.status).not.toBe(0)
    expect(JSON.parse(result.stderr).reason).toBe("wrong_base_head")
  })

  it("adapter rejects staging into staging main into main and feature into main with wrong_base_head", () => {
    const adapter = path.join(
      repoRoot,
      ".cursor",
      "checks",
      "coderabbit-pr-gate.mjs",
    )
    const fixtures = [
      "remote-staging-into-staging.json",
      "remote-main-into-main.json",
      "remote-feature-into-main.json",
    ]

    for (const name of fixtures) {
      const fixture = path.join(
        repoRoot,
        "tests",
        "unit",
        "dev-toolchain",
        "fixtures",
        name,
      )
      const result = spawnSync(
        process.execPath,
        [adapter, "--snapshot", fixture],
        {
          encoding: "utf8",
        },
      )

      expect(result.status).not.toBe(0)
      expect(JSON.parse(result.stderr).reason).toBe("wrong_base_head")
    }
  })

  it("adapter rejects empty missing and whitespace base or head with wrong_base_head", () => {
    const adapter = path.join(
      repoRoot,
      ".cursor",
      "checks",
      "coderabbit-pr-gate.mjs",
    )
    const fixtures = [
      "remote-staging-empty-head.json",
      "remote-staging-omitted-head.json",
      "remote-staging-whitespace-head.json",
      "remote-staging-empty-base.json",
      "remote-staging-omitted-base.json",
      "remote-staging-whitespace-base.json",
    ]

    for (const name of fixtures) {
      const fixture = path.join(
        repoRoot,
        "tests",
        "unit",
        "dev-toolchain",
        "fixtures",
        name,
      )
      const result = spawnSync(
        process.execPath,
        [adapter, "--snapshot", fixture],
        {
          encoding: "utf8",
        },
      )

      expect(result.status).not.toBe(0)
      expect(JSON.parse(result.stderr).reason).toBe("wrong_base_head")
    }
  })

  it("adapter gh spawnSync fallbacks set a finite timeout", () => {
    const source = stripHashAndLineComments(
      readFileSync(
        path.join(repoRoot, ".cursor", "checks", "coderabbit-pr-gate.mjs"),
        "utf8",
      ),
    )

    const optionTimeouts = ["repoFromEnv", "resolveToken"].map((name) => {
      const marker = `function ${name}`
      const start = source.indexOf(marker)
      const fromFn = start === -1 ? "" : source.slice(start)
      const next = fromFn
        .slice(marker.length)
        .search(/\nfunction |\nasync function /)
      const fnSource =
        next === -1 ? fromFn : fromFn.slice(0, marker.length + next)
      const match = /spawnSync\(\s*["']gh["'][\s\S]*?(\{[\s\S]*?\})/.exec(
        fnSource,
      )
      if (!match) {
        return undefined
      }
      try {
        return new Function(
          "process",
          `"use strict"; return (${match[1]}).timeout`,
        )({ platform: "win32" }) as unknown
      } catch {
        return undefined
      }
    })

    expect({
      repoFromEnv: Number(optionTimeouts[0]) > 0,
      resolveToken: Number(optionTimeouts[1]) > 0,
    }).toEqual({
      repoFromEnv: true,
      resolveToken: true,
    })
  })
})

describe("G-CR3 parsed drafts boolean", () => {
  it("comment-only drafts true does not enable draft review", () => {
    const commentOnlyYaml = [
      "reviews:",
      "  auto_review:",
      "    enabled: true",
      "    # drafts: true",
      "",
    ].join("\n")
    const liveYaml = readFileSync(
      path.join(repoRoot, ".coderabbit.yaml"),
      "utf8",
    )

    expect(
      detectCoderabbitYamlViolations(commentOnlyYaml).length,
    ).toBeGreaterThan(0)
    expect(detectCoderabbitYamlViolations(liveYaml)).toEqual([])
  })

  it("quoted drafts true does not enable draft review", () => {
    const quotedYaml = [
      "reviews:",
      "  auto_review:",
      "    enabled: true",
      '    drafts: "true"',
      "",
    ].join("\n")
    const liveYaml = readFileSync(
      path.join(repoRoot, ".coderabbit.yaml"),
      "utf8",
    )

    expect(detectCoderabbitYamlViolations(quotedYaml).length).toBeGreaterThan(0)
    expect(detectCoderabbitYamlViolations(liveYaml)).toEqual([])
  })
})

describe("G-CR3 US-only allow-list", () => {
  it("G-CR3 is US-only allow-list", () => {
    const spec = readFileSync(
      path.join(repoRoot, "docs", "specs", "dev-toolchain.md"),
      "utf8",
    )
    const gcr3Start = spec.indexOf("9. **G-CR3")
    const implStart = spec.indexOf("## Implementation")
    const gcr3Body = spec.slice(gcr3Start, implStart)

    expect(gcr3Body).toContain("wrong_bot")
    expect(gcr3Body).toContain("347564")
    expect(gcr3Body).toContain("coderabbitai")
    expect(gcr3Body).not.toContain("coderabbiteu")
    expect(gcr3Body).not.toContain("3307191")
    expect(gcr3Body).not.toContain("eu_bot_activity")
    expect(gcr3Body).not.toContain("EU-bot")
    expect(gcr3Body).not.toContain("EU activity")

    const command = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "ready-merge-release.md"),
      "utf8",
    )
    expect(command).toContain("wrong bot")
    expect(command).not.toContain("coderabbiteu")
    expect(command).not.toContain("3307191")
    expect(command).not.toContain("eu_bot_activity")
    expect(command).not.toContain("EU-bot")
    expect(command).not.toContain("EU activity")

    const rule = readFileSync(
      path.join(repoRoot, ".cursor", "rules", "coderabbit-integration.mdc"),
      "utf8",
    )
    expect(rule).not.toContain("coderabbiteu")
    expect(rule).not.toContain("3307191")
    expect(rule).not.toContain("eu_bot_activity")
    expect(rule).not.toContain("EU-bot")
    expect(rule).not.toContain("EU activity")
  })

  it("US approval does not hide a non-US CodeRabbit review", () => {
    const snapshot = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          "tests",
          "unit",
          "dev-toolchain",
          "fixtures",
          "remote-us-and-coderabbit-other.json",
        ),
        "utf8",
      ),
    )
    const result = evaluateReadyPr(snapshot)

    expect({ ok: result.ok, reason: result.reason }).toEqual({
      ok: false,
      reason: "wrong_bot",
    })
  })

  it("non-US CodeRabbit thread is wrong_bot not unresolved_threads", () => {
    const snapshot = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          "tests",
          "unit",
          "dev-toolchain",
          "fixtures",
          "remote-us-and-coderabbit-other-thread.json",
        ),
        "utf8",
      ),
    )
    const result = evaluateReadyPr(snapshot)

    expect({ ok: result.ok, reason: result.reason }).toEqual({
      ok: false,
      reason: "wrong_bot",
    })
  })

  it("US approval does not hide a non-US CodeRabbit issue or inline review comment", () => {
    const fixtures = [
      "remote-us-and-coderabbit-other-issue-comment.json",
      "remote-us-and-coderabbit-other-review-comment.json",
    ]

    for (const name of fixtures) {
      const snapshot = JSON.parse(
        readFileSync(
          path.join(
            repoRoot,
            "tests",
            "unit",
            "dev-toolchain",
            "fixtures",
            name,
          ),
          "utf8",
        ),
      )
      const result = evaluateReadyPr(snapshot)

      expect({ ok: result.ok, reason: result.reason }).toEqual({
        ok: false,
        reason: "wrong_bot",
      })
    }
  })

  it("coderabbit-shaped GitHub App without App ID 347564 is wrong_bot", () => {
    const snapshot = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          "tests",
          "unit",
          "dev-toolchain",
          "fixtures",
          "remote-coderabbit-slug-without-us-app-id.json",
        ),
        "utf8",
      ),
    )
    const result = evaluateReadyPr(snapshot)

    expect({ ok: result.ok, reason: result.reason }).toEqual({
      ok: false,
      reason: "wrong_bot",
    })
  })

  it("unresolved work-order plan thread is not a G-CR3 finding", () => {
    const clean = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          ".cursor",
          "checks",
          "fixtures",
          "coderabbit",
          "remote-clean.json",
        ),
        "utf8",
      ),
    )

    const withUnresolvedUsThread = (filePath: string) => ({
      ...clean,
      threads: [
        {
          isResolved: false,
          isOutdated: false,
          path: filePath,
          comments: {
            nodes: [
              {
                author: { login: "coderabbitai[bot]" },
                path: filePath,
                body: "please fix",
              },
            ],
          },
        },
      ],
    })

    const planResult = evaluateReadyPr(
      withUnresolvedUsThread(".cursor/plans/example.plan.md"),
    )
    const productResult = evaluateReadyPr(
      withUnresolvedUsThread("lib/billing/foo.ts"),
    )

    expect({
      plan: { ok: planResult.ok, reason: planResult.reason },
      product: { ok: productResult.ok, reason: productResult.reason },
    }).toEqual({
      plan: { ok: true, reason: "clean" },
      product: { ok: false, reason: "unresolved_threads" },
    })
  })

  it("ready-merge undoes on drift only when this invocation ran gh pr ready", () => {
    const command = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "ready-merge-release.md"),
      "utf8",
    )
    const readyStart = command.indexOf("### 3. Ready")
    const afterReady = command.indexOf("### 4.", readyStart)
    const step3 =
      readyStart === -1 || afterReady <= readyStart
        ? ""
        : command.slice(readyStart, afterReady)
    const mutationAt = step3.search(/run `gh pr ready(?! --undo)/)
    const beforeReady = mutationAt === -1 ? "" : step3.slice(0, mutationAt)

    const step4Start = command.indexOf("### 4.")
    const afterStep4 = command.indexOf("### 5.", step4Start)
    const step4 =
      step4Start === -1 || afterStep4 <= step4Start
        ? ""
        : command.slice(step4Start, afterStep4)

    const rule = readFileSync(
      path.join(repoRoot, ".cursor", "rules", "coderabbit-integration.mdc"),
      "utf8",
    )
    const remoteStart = rule.indexOf("## Remote enforcement")
    const nextRemoteHeading = rule.indexOf("\n## ", remoteStart + 1)
    const remote =
      remoteStart === -1
        ? ""
        : nextRemoteHeading === -1
          ? rule.slice(remoteStart)
          : rule.slice(remoteStart, nextRemoteHeading)

    const justReadyUndoGate = (slice: string) =>
      slice.includes("gh pr ready --undo") && /this invocation/.test(slice)

    expect({
      step3HasGhPrView: beforeReady.includes("gh pr view"),
      step3HasHeadRefOid: beforeReady.includes("headRefOid"),
      step3HasPreReadyHead: beforeReady.includes("preReadyHead"),
      step4UndoesOnlyWhenJustReady:
        justReadyUndoGate(step4) && /already-ready/i.test(step4),
      factoryUndoesOnlyWhenJustReady: justReadyUndoGate(remote),
    }).toEqual({
      step3HasGhPrView: true,
      step3HasHeadRefOid: true,
      step3HasPreReadyHead: true,
      step4UndoesOnlyWhenJustReady: true,
      factoryUndoesOnlyWhenJustReady: true,
    })
  })

  it("linear-automation remote findings route Critical/Major/unknown to /sdd-to-tdd", () => {
    const rule = readFileSync(
      path.join(repoRoot, ".cursor", "rules", "linear-automation.mdc"),
      "utf8",
    )
    const remoteStart = rule.indexOf("Remote findings")
    const nextHeading = rule.indexOf("## GitHub PR automations", remoteStart)
    const remoteFindings =
      remoteStart === -1 || nextHeading <= remoteStart
        ? ""
        : rule.slice(remoteStart, nextHeading)

    expect({
      namesSddForCriticalMajorUnknown:
        /Critical\/Major\/unknown/.test(remoteFindings) &&
        remoteFindings.includes("/sdd-to-tdd"),
      doesNotRouteAllThroughCaptureThenTriage:
        !/Remote findings go through\s*`\/capture`\s*then\s*`\/triage`/.test(
          remoteFindings,
        ),
      keepsProvenance: remoteFindings.includes(
        "coderabbit/<local|PR>/<head>/<finding-id>",
      ),
    }).toEqual({
      namesSddForCriticalMajorUnknown: true,
      doesNotRouteAllThroughCaptureThenTriage: true,
      keepsProvenance: true,
    })
  })

  it("ready-merge handoff commands omit remote finding fields", () => {
    const command = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "ready-merge-release.md"),
      "utf8",
    )
    const step2Start = command.indexOf("### 2.")
    const afterStep2 = command.indexOf("### 3.", step2Start)
    const step2 =
      step2Start === -1 || afterStep2 <= step2Start
        ? ""
        : command.slice(step2Start, afterStep2)

    const criticalAt = step2.indexOf("Critical/Major/unknown")
    const minorAt = step2.indexOf("Minor/Trivial")
    const criticalSlice =
      criticalAt === -1 || minorAt <= criticalAt
        ? ""
        : step2.slice(criticalAt, minorAt)
    const minorSlice = minorAt === -1 ? "" : step2.slice(minorAt)

    const fencesIn = (slice: string) =>
      [...slice.matchAll(/`(\/(?:sdd-to-tdd|capture)\s+[^`]+)`/g)].map(
        (match) => match[1],
      )

    const sddFences = fencesIn(criticalSlice)
    const captureFences = fencesIn(minorSlice)
    const handoffFences = fencesIn(step2)

    const interpolatesRemoteFindingFields = (fence: string) =>
      /<finding-id>|<path>|<concise title>|<severity>|finding-id|concise title/i.test(
        fence,
      )
    const invocationOrRemotePlaceholder = new Set([
      "finding-id",
      "path",
      "concise title",
      "severity",
      "n",
      "head",
    ])
    const hasOpaqueLocalRef = (fence: string) =>
      [...fence.matchAll(/<([^>]+)>/g)].some(
        (match) => !invocationOrRemotePlaceholder.has(match[1].trim()),
      )

    expect({
      routesCriticalMajorUnknownToSdd: sddFences.some((fence) =>
        fence.startsWith("/sdd-to-tdd"),
      ),
      routesMinorTrivialToCapture: captureFences.some((fence) =>
        fence.startsWith("/capture"),
      ),
      fencesOmitRemoteFields:
        handoffFences.length > 0 &&
        handoffFences.every((fence) => !interpolatesRemoteFindingFields(fence)),
      fencesUseOpaqueLocalRef:
        handoffFences.length > 0 &&
        handoffFences.every((fence) => hasOpaqueLocalRef(fence)),
    }).toEqual({
      routesCriticalMajorUnknownToSdd: true,
      routesMinorTrivialToCapture: true,
      fencesOmitRemoteFields: true,
      fencesUseOpaqueLocalRef: true,
    })
  })
})

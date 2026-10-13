import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

/** Step 3 no-argument branch only, so a later "non-zero" cannot satisfy G-WIP3. */
function noArgumentBranch(markdown: string): string {
  const marker = "**No argument:**"
  const start = markdown.indexOf(marker)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const next = rest.search(/\n### /)
  return next === -1 ? rest : rest.slice(0, next)
}

/** Reuse bullet only. The zero-open auto-create tail must not satisfy G-WIP2. */
function foundReuseSlice(noArgument: string): string {
  const marker = "**Found (exactly one):**"
  const start = noArgument.indexOf(marker)
  if (start === -1) return ""
  const rest = noArgument.slice(start)
  const next = rest.indexOf("**None found")
  return next === -1 ? rest : rest.slice(0, next)
}

function noneFoundSlice(noArgument: string): string {
  const marker = "**None found"
  const start = noArgument.indexOf(marker)
  if (start === -1) return ""
  return noArgument.slice(start)
}

function between(
  markdown: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = markdown.indexOf(startMarker)
  if (start === -1) return ""
  const end = markdown.indexOf(endMarker, start + startMarker.length)
  return end === -1 ? markdown.slice(start) : markdown.slice(start, end)
}

function sameLine(slice: string, parts: RegExp[]): boolean {
  return slice
    .split("\n")
    .some((line) => parts.every((part) => part.test(line)))
}

/** A positive `gh` write. Negations and `gh pr ready --undo` do not count. */
function imperativeLine(slice: string, command: string): boolean {
  return slice.split("\n").some((line) => {
    if (!line.includes(command)) return false
    if (command === "gh pr ready" && line.includes("--undo")) return false
    return !/\b(not|never|no)\b/i.test(line)
  })
}

/**
 * G-WIP1 first step only. A later `/push` create, or `gh pr create` mentioned
 * only at publication time, does not match this window.
 */
const WIP_FIRST_STEP =
  /this head has no open PR[\s\S]{0,700}before the first code change[\s\S]{0,700}allow-empty[\s\S]{0,700}wip\(<KEY>\): start run[\s\S]{0,700}push, then[\s\S]{0,200}gh pr create --draft --base staging[\s\S]{0,900}\[WIP\][\s\S]{0,700}Closes <KEY>[\s\S]{0,700}agent-running/

/**
 * List entries under `ignore_title_keywords` only. A bare `WIP` entry is
 * not the token `[WIP]` (quoted or not).
 */
function ignoreTitleKeywords(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/)
  const header = lines.findIndex((line) =>
    /^\s*ignore_title_keywords:\s*$/.test(line),
  )
  if (header === -1) return []
  const headerIndent = /^\s*/.exec(lines[header])?.[0].length ?? 0
  const keywords: string[] = []
  for (const line of lines.slice(header + 1)) {
    if (!line.trim() || /^\s*#/.test(line)) continue
    const indent = /^\s*/.exec(line)?.[0].length ?? 0
    if (indent <= headerIndent) break
    const item = /^\s*-\s+(.*)$/.exec(line)
    if (!item) break
    const raw = item[1].trim()
    const quote = raw[0]
    keywords.push(
      (quote === '"' || quote === "'") && raw.endsWith(quote) && raw.length >= 2
        ? raw.slice(1, -1)
        : raw,
    )
  }
  return keywords
}

/**
 * G-WIP6 no-op close only. Conduct's hard-limit "Never write In Progress"
 * and a later "Linear state write" line do not match this window.
 */
function noopCloseSlice(markdown: string): string {
  const marker = "no-op run"
  const start = markdown.indexOf(marker)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const next = rest.search(/\n#{2,3} /)
  const window = next === -1 ? rest : rest.slice(0, next)
  return window.slice(0, 1200)
}

/**
 * G-WIP7 in-flight bullet only. The first-step `agent-running` label and
 * `roundCap` must not satisfy the capacity pin.
 */
function inFlightBullet(markdown: string): string {
  const marker = "**In flight:**"
  const start = markdown.indexOf(marker)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const next = rest.search(/\n\n/)
  return next === -1 ? rest : rest.slice(0, next)
}

/** In-loop paragraph only, so the no-PR create steps cannot satisfy the skip. */
function inLoopFixSlice(markdown: string): string {
  const marker = "**In-loop fix.**"
  const start = markdown.indexOf(marker)
  if (start === -1) return ""
  const rest = markdown.slice(start + marker.length)
  const next = rest.search(/\n\*\*[^*\n]/)
  return next === -1
    ? markdown.slice(start)
    : markdown.slice(start, start + marker.length + next)
}

describe("WIP draft PR", () => {
  it("selectOpenHeadPr fails closed on duplicate open PRs", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/gate-evidence-policy.mjs")
    expect(typeof mod.selectOpenHeadPr).toBe("function")

    const one = { number: 11 }
    const two = { number: 22 }
    expect(mod.selectOpenHeadPr([])).toEqual({ ok: false, reason: "none" })
    expect(mod.selectOpenHeadPr([one])).toEqual({ ok: true, pr: one })
    expect(mod.selectOpenHeadPr([one, two])).toEqual({
      ok: false,
      reason: "duplicate_open_prs",
    })

    const push = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "push.md"),
      "utf8",
    )
    const noArgument = noArgumentBranch(push)
    expect(noArgument).toContain("gh pr list --head")
    expect(noArgument).toContain("--state open")
    expect(noArgument).toContain("duplicate_open_prs")
    expect(noArgument).toMatch(
      /duplicate_open_prs[\s\S]{0,400}non-zero|non-zero[\s\S]{0,400}duplicate_open_prs/,
    )
  })

  it("protected CLI evidence is authoritative and SHA-bound", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/coderabbit-pr-policy.mjs")
    expect(typeof mod.protectedCliEvidenceStatus).toBe("function")
    expect(typeof mod.replaceProtectedCliEvidence).toBe("function")
    expect(typeof mod.qaDraftEvidenceVerdict).toBe("function")
    expect(typeof mod.renderCliEvidenceBlock).toBe("function")
    expect(typeof mod.cliEvidenceOutputHash).toBe("function")

    const headSha = "0123456789abcdef0123456789abcdef01234567"
    const otherSha = "fedcba9876543210fedcba9876543210fedcba98"
    const decoy = `<!-- coderabbit-cli-evidence:${otherSha}:findings:zzzz -->`
    const outsideHead = `<!-- coderabbit-cli-evidence:${headSha}:findings:zzzz -->`
    const marker = `<!-- coderabbit-cli-evidence:${headSha}:clean:c0ffee -->`
    const inline = "See ## CodeRabbit CLI evidence in the runbook"
    const deeper = "### CodeRabbit CLI evidence"
    const rendered = mod.renderCliEvidenceBlock({
      head: headSha,
      attemptStatus: "clean",
      reason: "clean",
      hash: "c0ffee",
    })
    expect(rendered).toContain(
      `<!-- coderabbit-cli-evidence:${headSha}:clean:c0ffee -->`,
    )
    expect(mod.cliEvidenceOutputHash("jsonl")).toMatch(/^[0-9a-f]{64}$/)
    const body = [
      decoy,
      inline,
      deeper,
      "## Decoy heading",
      decoy,
      "## CodeRabbit CLI evidence",
      marker,
      "## CodeRabbit note",
      decoy,
      outsideHead,
    ].join("\n")

    expect(mod.protectedCliEvidenceStatus(body, headSha)).toBe("clean")
    expect(mod.protectedCliEvidenceStatus(body, otherSha)).not.toBe("findings")

    const rewritten = mod.replaceProtectedCliEvidence(
      body,
      [
        "## CodeRabbit CLI evidence",
        `<!-- coderabbit-cli-evidence:${headSha}:unavailable:eeee -->`,
        "",
      ].join("\n"),
    )
    expect(mod.protectedCliEvidenceStatus(rewritten, headSha)).toBe(
      "unavailable",
    )
    expect(rewritten).toContain(decoy)
    expect(rewritten.match(/^## CodeRabbit CLI evidence$/gm)).toHaveLength(1)
    expect(mod.protectedCliEvidenceStatus(rewritten, otherSha)).not.toBe(
      "findings",
    )

    expect(
      mod.qaDraftEvidenceVerdict({
        isDraft: true,
        headSha: otherSha,
        body,
      }),
    ).toEqual({ ok: false, reason: "missing_head_evidence" })
    expect(
      mod.qaDraftEvidenceVerdict({
        isDraft: true,
        headSha: otherSha,
        body,
        commentStatus: 403,
      }),
    ).toEqual({ ok: false, reason: "missing_head_evidence" })
    const onHead = mod.qaDraftEvidenceVerdict({
      isDraft: true,
      headSha,
      body,
      commentStatus: 403,
    })
    expect(onHead).toBeDefined()
    expect(onHead.reason).not.toBe("missing_head_evidence")

    const ready = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "ready-merge-release.md"),
      "utf8",
    )
    expect(ready).toContain("missing_head_evidence")
    expect(ready).toMatch(
      /missing_head_evidence[\s\S]{0,800}ignor|ignor[\s\S]{0,800}missing_head_evidence/i,
    )
    expect(ready).toMatch(
      /403[\s\S]{0,500}(?:body section|CodeRabbit CLI evidence)[\s\S]{0,300}authoritative|authoritative[\s\S]{0,500}(?:body section|CodeRabbit CLI evidence)/i,
    )
  })

  it("push reuses the single open head PR and strips WIP", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/gate-evidence-policy.mjs")
    const evidence =
      await import("../../../.cursor/hooks/lib/coderabbit-pr-policy.mjs")
    const one = { number: 11 }
    expect(mod.selectOpenHeadPr([one]).ok).toBe(true)
    expect(mod.selectOpenHeadPr([])).toEqual({ ok: false, reason: "none" })

    const push = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "push.md"),
      "utf8",
    )
    const noArgument = noArgumentBranch(push)
    const found = foundReuseSlice(noArgument)
    const noneFound = noneFoundSlice(noArgument)
    const leaveDraft = between(
      push,
      "### 5. Leave the PR a draft",
      "### 6. Report checks",
    )

    expect(found).toContain("**Found (exactly one):**")
    expect(found).toContain("proceed")
    expect(found).not.toContain("gh pr create")
    expect(found).toContain("feature-PR-on-default STOP")
    expect(noneFound).not.toContain("**Found (exactly one):**")
    expect(noneFound).toContain("gh pr create --draft")
    expect(noneFound).toContain("created — draft")
    expect(noneFound).toContain("non-default head: `--base staging`")
    expect(noArgument).not.toContain("--base main")
    expect(found).not.toMatch(/--base\s+main/)

    const headSha = "0123456789abcdef0123456789abcdef01234567"
    const rewritten = evidence.replaceProtectedCliEvidence(
      "summary\n",
      [
        "## CodeRabbit CLI evidence",
        `<!-- coderabbit-cli-evidence:${headSha}:clean:c0ffee -->`,
      ].join("\n"),
    )
    expect(rewritten).toContain("<!-- coderabbit-cli-evidence:")
    expect(evidence.protectedCliEvidenceStatus(rewritten, headSha)).toBe(
      "clean",
    )
    expect(leaveDraft).toContain("## CodeRabbit CLI evidence")
    expect(leaveDraft).toContain("finalized head")

    expect(push).toContain("--draft")
    expect(push).toContain("gh pr ready --undo")
    const reuseDraft = `${found}\n${leaveDraft}`
    expect(imperativeLine(reuseDraft, "gh pr ready")).toBe(false)
    expect(imperativeLine(reuseDraft, "gh pr merge")).toBe(false)

    expect({
      stripsWipTitle: sameLine(found, [/strip|remov/i, /\[WIP\]/, /title/i]),
      removesAgentRunning: sameLine(found, [
        /strip|remov/i,
        /agent-running/,
        /label/i,
      ]),
    }).toEqual({
      stripsWipTitle: true,
      removesAgentRunning: true,
    })
  })

  it("ticket-work commands open one WIP draft before first code change", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/gate-evidence-policy.mjs")
    expect(typeof mod.formatWipStart).toBe("function")

    const runUrl = "https://example.test/run"
    const start = mod.formatWipStart({ key: "RES-154", runUrl })
    expect(start).toEqual(
      expect.objectContaining({
        commitMessage: expect.stringMatching(/^wip\(RES-154\): start run/),
        title: expect.stringMatching(/^\[WIP\]/),
        body: expect.stringContaining("Closes RES-154"),
        label: "agent-running",
      }),
    )
    expect(start.commitMessage).toContain(runUrl)
    expect(start.body).toContain(runUrl)

    for (const file of ["conduct.md", "sdd-to-tdd.md", "design.md"]) {
      const text = readFileSync(
        path.join(repoRoot, ".cursor", "commands", file),
        "utf8",
      )
      expect(WIP_FIRST_STEP.test(text), file).toBe(true)
    }

    const sdd = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "sdd-to-tdd.md"),
      "utf8",
    )
    const inLoop = inLoopFixSlice(sdd)
    expect(inLoop).toContain("already-open head PR")
    expect(inLoop).toMatch(/MUST NOT open a second draft/)
    expect(inLoop).not.toContain("gh pr create --draft")
  })

  it("WIP title skips CodeRabbit review and Vercel build", async () => {
    const yaml = readFileSync(path.join(repoRoot, ".coderabbit.yaml"), "utf8")
    const keywords = ignoreTitleKeywords(yaml)
    expect(keywords).toContain("[WIP]")

    const vercelPath = path.join(repoRoot, "vercel.json")
    expect(existsSync(vercelPath)).toBe(true)
    const vercel = JSON.parse(readFileSync(vercelPath, "utf8")) as {
      ignoreCommand?: unknown
      crons?: unknown
    }
    expect(typeof vercel.ignoreCommand).toBe("string")
    expect(String(vercel.ignoreCommand).length).toBeGreaterThan(0)
    expect(vercel.crons ?? []).toEqual([])

    const mod =
      await import("../../../.cursor/hooks/lib/gate-evidence-policy.mjs")
    expect(typeof mod.shouldIgnoreWipBuild).toBe("function")
    expect(
      mod.shouldIgnoreWipBuild({
        title: "[WIP] foo",
        commitMessage: "feat: x",
      }),
    ).toBe(true)
    expect(
      mod.shouldIgnoreWipBuild({
        title: "Ready",
        commitMessage: "wip(RES-154): start run https://x",
      }),
    ).toBe(true)
    expect(
      mod.shouldIgnoreWipBuild({
        title: "Ready",
        commitMessage: "feat: x",
      }),
    ).toBe(false)
  })

  it("protected Vercel env and branch never skip a WIP build", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/gate-evidence-policy.mjs")
    expect(typeof mod.shouldIgnoreWipBuild).toBe("function")

    const script = path.join(
      repoRoot,
      ".cursor",
      "hooks",
      "lib",
      "ignore-wip-build.mjs",
    )
    const wipTitle = "[WIP] RES-154"
    const startCommit = "wip(RES-154): start run https://x"
    const previewBranch = "cursor/res-154-wip"
    const wipShapes = [
      {
        shape: "[WIP] title",
        title: wipTitle,
        commitMessage: "feat: x",
        scriptMessage: wipTitle,
      },
      {
        shape: "start commit",
        title: "Ready",
        commitMessage: startCommit,
        scriptMessage: startCommit,
      },
    ]
    const cases = [
      ...["production", "staging"].flatMap((env) =>
        wipShapes.map((shape) => ({
          label: `env: ${env} + ${shape.shape}`,
          input: {
            title: shape.title,
            commitMessage: shape.commitMessage,
            env,
          },
          ignore: false,
          scriptEnv: {
            VERCEL_ENV: env,
            VERCEL_GIT_COMMIT_MESSAGE: shape.scriptMessage,
          },
          exitCode: 1,
        })),
      ),
      ...["staging", "main"].flatMap((branch) =>
        wipShapes.map((shape) => ({
          label: `branch: ${branch} + ${shape.shape}`,
          input: {
            title: shape.title,
            commitMessage: shape.commitMessage,
            branch,
          },
          ignore: false,
          scriptEnv: {
            VERCEL_GIT_COMMIT_REF: branch,
            VERCEL_GIT_COMMIT_MESSAGE: shape.scriptMessage,
          },
          exitCode: 1,
        })),
      ),
      {
        label: "preview + [WIP] title",
        input: {
          title: wipTitle,
          commitMessage: "feat: x",
          env: "preview",
          branch: previewBranch,
        },
        ignore: true,
        scriptEnv: {
          VERCEL_ENV: "preview",
          VERCEL_GIT_COMMIT_REF: previewBranch,
          VERCEL_GIT_COMMIT_MESSAGE: wipTitle,
        },
        exitCode: 0,
      },
      {
        label: "preview + start commit",
        input: {
          title: "Ready",
          commitMessage: startCommit,
          env: "preview",
          branch: previewBranch,
        },
        ignore: true,
        scriptEnv: {
          VERCEL_ENV: "preview",
          VERCEL_GIT_COMMIT_REF: previewBranch,
          VERCEL_GIT_COMMIT_MESSAGE: startCommit,
        },
        exitCode: 0,
      },
    ]

    for (const row of cases) {
      expect(mod.shouldIgnoreWipBuild(row.input), `${row.label} helper`).toBe(
        row.ignore,
      )
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, ...row.scriptEnv },
      })
      expect(result.status, `${row.label} script`).toBe(row.exitCode)
    }
  })

  it("later commits on a [WIP] PR still skip the preview build", () => {
    const script = path.join(
      repoRoot,
      ".cursor",
      "hooks",
      "lib",
      "ignore-wip-build.mjs",
    )
    const later = "feat: later work on the same draft"
    const wipTitle = "[WIP] RES-154"
    const previewBranch = "cursor/res-154-wip"
    const env = { ...process.env }
    delete env.VERCEL_GIT_PULL_REQUEST_ID
    delete env.VERCEL_GIT_PULL_REQUEST_TITLE
    delete env.VERCEL_GIT_REPO_OWNER
    delete env.VERCEL_GIT_REPO_SLUG

    const skip = spawnSync(process.execPath, [script], {
      env: {
        ...env,
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: previewBranch,
        VERCEL_GIT_COMMIT_MESSAGE: later,
        VERCEL_GIT_PULL_REQUEST_TITLE: wipTitle,
      },
    })
    expect(skip.status).toBe(0)

    const noTitle = spawnSync(process.execPath, [script], {
      env: {
        ...env,
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: previewBranch,
        VERCEL_GIT_COMMIT_MESSAGE: later,
      },
    })
    expect(noTitle.status).toBe(1)

    const protectedEnv = spawnSync(process.execPath, [script], {
      env: {
        ...env,
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: previewBranch,
        VERCEL_GIT_COMMIT_MESSAGE: later,
        VERCEL_GIT_PULL_REQUEST_TITLE: wipTitle,
      },
    })
    expect(protectedEnv.status).toBe(1)
  })

  it("noop run closes the WIP draft with a reason", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/gate-evidence-policy.mjs")
    expect(typeof mod.shouldCloseNoopWip).toBe("function")

    const start = "wip(RES-154): start run https://example.test/run"
    expect(
      mod.shouldCloseNoopWip({
        commits: [{ message: start, empty: true }],
        furtherTrackedChange: false,
      }),
    ).toBe(true)
    expect(
      mod.shouldCloseNoopWip({
        commits: [{ message: start, empty: true }],
        furtherTrackedChange: true,
      }),
    ).toBe(false)
    expect(
      mod.shouldCloseNoopWip({
        commits: [
          { message: start, empty: true },
          { message: "feat: ship", empty: false },
        ],
        furtherTrackedChange: false,
      }),
    ).toBe(false)
    expect(
      mod.shouldCloseNoopWip({
        commits: [{ message: start, empty: false }],
        furtherTrackedChange: false,
      }),
    ).toBe(false)
    expect(
      mod.shouldCloseNoopWip({
        commits: [{ message: "feat: ship", empty: true }],
        furtherTrackedChange: false,
      }),
    ).toBe(false)

    for (const file of ["conduct.md", "sdd-to-tdd.md"]) {
      const text = readFileSync(
        path.join(repoRoot, ".cursor", "commands", file),
        "utf8",
      )
      const slice = noopCloseSlice(text)
      expect(slice, file).toContain("gh pr close <n> --comment")
      expect(slice, file).toMatch(/--comment[\s\S]{0,80}reason/)
      expect(slice, file).toContain("no Linear state write")
      expect(slice, file).toMatch(
        /(?:MUST NOT|must not|Do not|do not|Never) write[\s\S]{0,80}In Progress[\s\S]{0,40}In Review[\s\S]{0,40}Done/,
      )
      expect(slice, file).toMatch(/TPM bot owns[\s\S]{0,60}revert/)
    }
  })

  it("capacity counts agent-running drafts only", async () => {
    const mod =
      await import("../../../.cursor/hooks/lib/dispatch-capacity-policy.mjs")
    expect(typeof mod.countAgentRunningDrafts).toBe("function")

    const running = { isDraft: true, labels: ["agent-running"] }
    const runningWithOther = {
      isDraft: true,
      labels: ["agent-running", "other"],
    }
    const ghShape = { isDraft: true, labels: [{ name: "agent-running" }] }
    const specOnly = { isDraft: true, labels: ["spec-only"] }
    const morning = { isDraft: true, labels: ["morning"] }
    const readyWithLabel = { isDraft: false, labels: ["agent-running"] }

    expect(
      mod.countAgentRunningDrafts([
        running,
        runningWithOther,
        specOnly,
        morning,
        readyWithLabel,
        { isDraft: true, labels: [] },
        { isDraft: true },
        ghShape,
      ]),
    ).toBe(3)
    expect(mod.countAgentRunningDrafts([specOnly, morning])).toBe(0)
    expect(mod.countAgentRunningDrafts([])).toBe(0)

    const conduct = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "conduct.md"),
      "utf8",
    )
    const inFlight = inFlightBullet(conduct)
    expect(inFlight).toContain("countAgentRunningDrafts")
    expect(inFlight).toContain("agent-running")
    expect(inFlight).toMatch(/\bdrafts?\b/)
    expect(inFlight).toMatch(/\bcap\b/i)
  })
})

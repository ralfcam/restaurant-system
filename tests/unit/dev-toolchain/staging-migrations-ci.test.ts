import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const workflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "staging-migrations.yml",
)

function stripYamlComments(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      let quote: "'" | '"' | null = null
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (quote) {
          if (ch === quote) quote = null
          continue
        }
        if (ch === "'" || ch === '"') {
          quote = ch
          continue
        }
        if (ch === "#") return line.slice(0, i).trimEnd()
      }
      return line.trimEnd()
    })
    .join("\n")
}

function stripQuotes(source: string): string {
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, " ")
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function indentOf(line: string): number {
  return /^ */.exec(line)?.[0].length ?? 0
}

function keyAt(line: string): { key: string; rest: string } | null {
  const match = /^\s*(['"]?)([A-Za-z0-9_-]+)\1\s*:(.*)$/.exec(line)
  if (!match) return null
  return { key: match[2], rest: match[3].trim() }
}

function childBlock(lines: string[], index: number): string[] {
  const parentIndent = indentOf(lines[index] ?? "")
  const children: string[] = []
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === "") continue
    if (indentOf(line) <= parentIndent) break
    children.push(line)
  }
  return children
}

function findChildKey(block: string[], key: string): number {
  const content = block.filter((line) => line.trim() !== "")
  if (content.length === 0) return -1
  const minIndent = Math.min(...content.map(indentOf))
  return block.findIndex((line) => {
    if (line.trim() === "" || indentOf(line) !== minIndent) return false
    return keyAt(line)?.key === key
  })
}

function pushBranchNames(yaml: string): string[] {
  const lines = stripYamlComments(yaml).split("\n")
  const onIndex = lines.findIndex(
    (line) => indentOf(line) === 0 && keyAt(line)?.key === "on",
  )
  if (onIndex === -1) return []

  const onRest = keyAt(lines[onIndex])?.rest ?? ""
  if (onRest && !onRest.startsWith("{") && !onRest.startsWith("[")) return []

  const onBlock = childBlock(lines, onIndex)
  const pushIndex = findChildKey(onBlock, "push")
  if (pushIndex === -1) return []

  const pushBlock = childBlock(onBlock, pushIndex)
  const branchesIndex = findChildKey(pushBlock, "branches")
  if (branchesIndex === -1) return []

  const inline = keyAt(pushBlock[branchesIndex])?.rest ?? ""
  if (inline.startsWith("[")) {
    const end = inline.indexOf("]")
    const inner = inline.slice(1, end === -1 ? undefined : end)
    return inner
      .split(",")
      .map((part) => unquote(part))
      .filter((part) => part.length > 0)
  }
  if (
    inline &&
    inline !== "|" &&
    inline !== ">" &&
    inline !== "|-" &&
    inline !== ">-"
  ) {
    return [unquote(inline)]
  }

  return childBlock(pushBlock, branchesIndex)
    .map((line) => {
      const item = /^\s*-\s+(.+)$/.exec(line)
      return item ? unquote(item[1].trim()) : ""
    })
    .filter((name) => name.length > 0)
}

function runScripts(yaml: string): string {
  const lines = stripYamlComments(yaml).split("\n")
  const chunks: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const parsed = keyAt(lines[i])
    if (!parsed || parsed.key !== "run") continue
    if (
      parsed.rest === "|" ||
      parsed.rest === "|-" ||
      parsed.rest === ">" ||
      parsed.rest === ">-"
    ) {
      chunks.push(
        childBlock(lines, i)
          .map((line) => line.trim())
          .join("\n"),
      )
      continue
    }
    chunks.push(parsed.rest)
  }
  return chunks.join("\n")
}

function jobEntries(yaml: string): { lines: string[] }[] {
  const lines = stripYamlComments(yaml).split("\n")
  const jobsIndex = lines.findIndex(
    (line) => indentOf(line) === 0 && keyAt(line)?.key === "jobs",
  )
  if (jobsIndex === -1) return []

  const block = childBlock(lines, jobsIndex)
  const content = block.filter((line) => line.trim() !== "")
  if (content.length === 0) return []
  const minIndent = Math.min(...content.map(indentOf))
  const jobs: { lines: string[] }[] = []
  for (let i = 0; i < block.length; i++) {
    const line = block[i]
    if (line.trim() === "" || indentOf(line) !== minIndent) continue
    if (!keyAt(line)) continue
    jobs.push({ lines: childBlock(block, i) })
  }
  return jobs
}

function directScalar(block: string[], key: string): string | null {
  const index = findChildKey(block, key)
  if (index === -1) return null
  const rest = keyAt(block[index])?.rest ?? ""
  if (
    rest === "" ||
    rest === "|" ||
    rest === "|-" ||
    rest === ">" ||
    rest === ">-"
  ) {
    return null
  }
  return unquote(rest)
}

function splitSteps(stepsBlock: string[]): string[][] {
  const content = stepsBlock.filter((line) => line.trim() !== "")
  if (content.length === 0) return []
  const markerIndent = Math.min(...content.map(indentOf))
  const steps: string[][] = []
  let current: string[] | null = null
  for (const line of stepsBlock) {
    if (line.trim() === "") continue
    const isMarker = indentOf(line) === markerIndent && /^\s*-\s+/.test(line)
    if (isMarker) {
      current = [line]
      steps.push(current)
      continue
    }
    current?.push(line)
  }
  return steps
}

function normalizeListItem(line: string): string {
  return line.replace(/^(\s*)-\s+/, "$1")
}

function stepRunScript(stepLines: string[]): string {
  const chunks: string[] = []
  for (let i = 0; i < stepLines.length; i++) {
    const line = stepLines[i]
    const parsed = keyAt(normalizeListItem(line))
    if (!parsed || parsed.key !== "run") continue
    if (
      parsed.rest === "|" ||
      parsed.rest === "|-" ||
      parsed.rest === ">" ||
      parsed.rest === ">-"
    ) {
      const runIndent = indentOf(line)
      const body: string[] = []
      for (let j = i + 1; j < stepLines.length; j++) {
        if (stepLines[j].trim() === "") continue
        if (indentOf(stepLines[j]) <= runIndent) break
        body.push(stepLines[j].trim())
      }
      chunks.push(body.join("\n"))
      continue
    }
    chunks.push(parsed.rest)
  }
  return chunks.join("\n")
}

function continueOnErrorScalar(lines: string[]): string | null {
  for (const line of lines) {
    const parsed = keyAt(normalizeListItem(line))
    if (parsed?.key !== "continue-on-error") continue
    if (
      parsed.rest === "" ||
      parsed.rest === "|" ||
      parsed.rest === "|-" ||
      parsed.rest === ">" ||
      parsed.rest === ">-"
    ) {
      continue
    }
    return unquote(parsed.rest)
  }
  return null
}

const dbPushCommand = /(?:^|\s)(?:npx\s+)?supabase\s+db\s+push\b/
const swallowedExit = /\|\|\s*(?:true|exit\s+0)\b/

function dbPushSites(yaml: string): {
  jobFlag: string | null
  stepFlag: string | null
  run: string
}[] {
  const sites: {
    jobFlag: string | null
    stepFlag: string | null
    run: string
  }[] = []
  for (const job of jobEntries(yaml)) {
    const stepsIndex = findChildKey(job.lines, "steps")
    if (stepsIndex === -1) continue
    const jobFlag = directScalar(job.lines, "continue-on-error")
    for (const step of splitSteps(childBlock(job.lines, stepsIndex))) {
      const run = stepRunScript(step)
      if (!dbPushCommand.test(stripQuotes(run))) continue
      sites.push({
        jobFlag,
        stepFlag: continueOnErrorScalar(step),
        run,
      })
    }
  }
  return sites
}

describe("G-MIG1 staging apply on push", () => {
  it("push to staging runs supabase db push", () => {
    expect(existsSync(workflowPath)).toBe(true)

    const yaml = readFileSync(workflowPath, "utf8")
    const active = stripQuotes(stripYamlComments(yaml))
    const applyCommand = stripQuotes(runScripts(yaml))

    expect(pushBranchNames(yaml)).toContain("staging")
    expect(applyCommand).toMatch(/(?:^|\s)(?:npx\s+)?supabase\s+db\s+push\b/)
    expect(active).not.toMatch(/\bdb\s+reset\b/)
  })
})

describe("G-MIG2 apply fails closed", () => {
  it("staging apply job fails closed", () => {
    expect(existsSync(workflowPath)).toBe(true)

    const sites = dbPushSites(readFileSync(workflowPath, "utf8"))
    expect(sites.length).toBeGreaterThan(0)

    for (const site of sites) {
      expect([site.jobFlag, site.stepFlag]).toContain("false")
      expect([site.jobFlag, site.stepFlag]).not.toContain("true")
      expect(site.run).not.toMatch(swallowedExit)
    }
  })
})

function onEventBlock(yaml: string, event: string): string[] | null {
  const lines = stripYamlComments(yaml).split("\n")
  const onIndex = lines.findIndex(
    (line) => indentOf(line) === 0 && keyAt(line)?.key === "on",
  )
  if (onIndex === -1) return null

  const onRest = keyAt(lines[onIndex])?.rest ?? ""
  if (onRest && !onRest.startsWith("{") && !onRest.startsWith("[")) return null

  const onBlock = childBlock(lines, onIndex)
  const eventIndex = findChildKey(onBlock, event)
  if (eventIndex === -1) return null
  return childBlock(onBlock, eventIndex)
}

function blockList(block: string[], key: string): string[] {
  const index = findChildKey(block, key)
  if (index === -1) return []

  const inline = keyAt(block[index])?.rest ?? ""
  if (inline.startsWith("[")) {
    const end = inline.indexOf("]")
    const inner = inline.slice(1, end === -1 ? undefined : end)
    return inner
      .split(",")
      .map((part) => unquote(part))
      .filter((part) => part.length > 0)
  }
  if (
    inline &&
    inline !== "|" &&
    inline !== ">" &&
    inline !== "|-" &&
    inline !== ">-"
  ) {
    return [unquote(inline)]
  }

  return childBlock(block, index)
    .map((line) => {
      const item = /^\s*-\s+(.+)$/.exec(line)
      return item ? unquote(item[1].trim()) : ""
    })
    .filter((name) => name.length > 0)
}

function pullRequestBranches(yaml: string): string[] {
  const block = onEventBlock(yaml, "pull_request")
  return block ? blockList(block, "branches") : []
}

function pullRequestPaths(yaml: string): string[] {
  const block = onEventBlock(yaml, "pull_request")
  return block ? blockList(block, "paths") : []
}

function jobRunScript(job: { lines: string[] }): string {
  const stepsIndex = findChildKey(job.lines, "steps")
  if (stepsIndex === -1) return ""
  return splitSteps(childBlock(job.lines, stepsIndex))
    .map((step) => stepRunScript(step))
    .join("\n")
}

function jobStepsSource(job: { lines: string[] }): string {
  const stepsIndex = findChildKey(job.lines, "steps")
  if (stepsIndex === -1) return ""
  return childBlock(job.lines, stepsIndex).join("\n")
}

function validatesNonEmptySql(script: string): boolean {
  const seesTree = script.includes("supabase/migrations")
  const seesSql = script.includes("*.sql") || script.includes(".sql")
  const rejectsEmpty =
    /(?:\[\s*|\[\[\s*)!?\s*-s\b/.test(script) ||
    /\btest\s+!?\s*-s\b/.test(script) ||
    /(?:^|[^A-Za-z])-empty\b/.test(script)
  return seesTree && seesSql && rejectsEmpty
}

function statesMergeAppliesToStaging(script: string): boolean {
  return (
    /\b(?:echo|printf)\b/.test(script) &&
    /\bmerge\b/i.test(script) &&
    /\bappl(?:y|ies|ied)\b/i.test(script) &&
    /\bstaging\b/i.test(script)
  )
}

describe("G-MIG3 PR migration check", () => {
  it("PRs that touch supabase/migrations run a pre-merge check", () => {
    expect(existsSync(workflowPath)).toBe(true)

    const yaml = readFileSync(workflowPath, "utf8")
    expect(pullRequestBranches(yaml)).toContain("staging")
    expect(pullRequestPaths(yaml)).toContain("supabase/migrations/**")

    const checks = jobEntries(yaml).filter((job) => {
      const script = jobRunScript(job)
      return validatesNonEmptySql(script) && statesMergeAppliesToStaging(script)
    })
    expect(checks.length).toBeGreaterThan(0)

    for (const job of checks) {
      const steps = jobStepsSource(job)
      expect(steps).not.toMatch(/\bdb\s+push\b/)
      expect(steps).not.toMatch(/\bdb\s+reset\b/)
    }
  })
})

describe("G-MIG4 secrets only", () => {
  it("staging apply credentials come from GitHub secrets", () => {
    expect(existsSync(workflowPath)).toBe(true)

    const yaml = readFileSync(workflowPath, "utf8")
    const applyJobs = jobEntries(yaml).filter((job) =>
      dbPushCommand.test(stripQuotes(jobRunScript(job))),
    )
    expect(applyJobs.length).toBeGreaterThan(0)

    for (const job of applyJobs) {
      const source = job.lines.join("\n")
      expect(source).toContain("${{ secrets.SUPABASE_ACCESS_TOKEN }}")
      expect(source).toContain("${{ secrets.SUPABASE_DB_PASSWORD }}")
    }

    expect(yaml).not.toMatch(/eyJ/)
    expect(yaml).not.toMatch(/sbp_/)
    expect(yaml).not.toMatch(/postgresql:\/\//)
  })
})

const workflowsDir = path.join(repoRoot, ".github", "workflows")
const stagingRefPin =
  /refs\/heads\/staging|github\.ref_name\s*==\s*['"]staging['"]/

function workflowYamlPaths(): string[] {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => path.join(workflowsDir, name))
}

function scalarOnIncludes(yaml: string, event: string): boolean {
  const lines = stripYamlComments(yaml).split("\n")
  const onIndex = lines.findIndex(
    (line) => indentOf(line) === 0 && keyAt(line)?.key === "on",
  )
  if (onIndex === -1) return false
  const rest = keyAt(lines[onIndex])?.rest ?? ""
  if (rest.startsWith("[")) {
    const end = rest.indexOf("]")
    const inner = rest.slice(1, end === -1 ? undefined : end)
    return inner
      .split(",")
      .map((part) => unquote(part.trim()))
      .includes(event)
  }
  if (!rest || rest.startsWith("{")) return false
  return unquote(rest) === event
}

function branchFilterIncludesMain(names: string[]): boolean {
  return names.some((name) => name === "main" || name === "*" || name === "**")
}

function eventRunsOnMain(
  yaml: string,
  event: "push" | "pull_request",
): boolean {
  const block = onEventBlock(yaml, event)
  if (block === null) return scalarOnIncludes(yaml, event)
  const ignore = blockList(block, "branches-ignore")
  if (branchFilterIncludesMain(ignore)) return false
  const branches = blockList(block, "branches")
  if (branches.length === 0) return true
  return branchFilterIncludesMain(branches)
}

function quotedEquals(condition: string, expr: string): string[] {
  const pattern = new RegExp(`${expr}\\s*==\\s*['"]([^'"]+)['"]`, "g")
  return [...condition.matchAll(pattern)].map((match) => match[1])
}

function conditionAllowsMain(
  condition: string | null,
  event: "push" | "pull_request",
): boolean {
  if (!condition) return true
  const eventNames = quotedEquals(condition, "github\\.event_name")
  if (eventNames.length > 0 && !eventNames.includes(event)) return false
  if (event === "push") {
    const pinned = [
      ...quotedEquals(condition, "github\\.ref_name"),
      ...[...condition.matchAll(/refs\/heads\/([A-Za-z0-9._/-]+)/g)].map(
        (match) => match[1],
      ),
    ]
    if (pinned.length > 0 && !pinned.includes("main")) return false
  }
  if (event === "pull_request") {
    const bases = quotedEquals(condition, "github\\.base_ref")
    if (bases.length > 0 && !bases.includes("main")) return false
  }
  return true
}

function scalarIf(lines: string[]): string | null {
  for (const line of lines) {
    const parsed = keyAt(normalizeListItem(line))
    if (parsed?.key !== "if") continue
    if (
      parsed.rest === "" ||
      parsed.rest === "|" ||
      parsed.rest === "|-" ||
      parsed.rest === ">" ||
      parsed.rest === ">-"
    ) {
      return null
    }
    return unquote(parsed.rest)
  }
  return null
}

function dbPushOnMain(yaml: string): string[] {
  const hits: string[] = []
  const pushOnMain = eventRunsOnMain(yaml, "push")
  const prOnMain = eventRunsOnMain(yaml, "pull_request")
  if (!pushOnMain && !prOnMain) return hits

  for (const job of jobEntries(yaml)) {
    const stepsIndex = findChildKey(job.lines, "steps")
    if (stepsIndex === -1) continue
    const jobIf = scalarIf(job.lines)
    for (const step of splitSteps(childBlock(job.lines, stepsIndex))) {
      if (!dbPushCommand.test(stripQuotes(stepRunScript(step)))) continue
      const stepIf = scalarIf(step)
      if (
        pushOnMain &&
        conditionAllowsMain(jobIf, "push") &&
        conditionAllowsMain(stepIf, "push")
      ) {
        hits.push("push to main")
      }
      if (
        prOnMain &&
        conditionAllowsMain(jobIf, "pull_request") &&
        conditionAllowsMain(stepIf, "pull_request")
      ) {
        hits.push("pull_request base main")
      }
    }
  }
  return hits
}

describe("G-MIG5 production not automatic", () => {
  it("no workflow applies migrations on main", () => {
    expect(existsSync(workflowPath)).toBe(true)

    const yaml = readFileSync(workflowPath, "utf8")
    const branches = pushBranchNames(yaml)
    expect(branches).toContain("staging")
    expect(branches).not.toContain("main")

    const gated = workflowYamlPaths().flatMap((file) =>
      dbPushOnMain(readFileSync(file, "utf8")).map(
        (reason) => `${path.basename(file)}: ${reason}`,
      ),
    )
    expect(gated).toEqual([])

    const applyJobs = jobEntries(yaml).filter((job) =>
      dbPushCommand.test(stripQuotes(jobRunScript(job))),
    )
    expect(applyJobs.length).toBeGreaterThan(0)
    for (const job of applyJobs) {
      expect(scalarIf(job.lines) ?? "").toMatch(stagingRefPin)
    }
  })
})

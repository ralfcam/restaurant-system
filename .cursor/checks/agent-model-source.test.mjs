import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { test } from "node:test"

const ROOT = process.cwd()
const AGENTS_DIR = join(ROOT, ".cursor", "agents")
const SCAN_DIRS = [
  join(ROOT, ".cursor", "commands"),
  join(ROOT, ".cursor", "rules"),
]

const MODEL_SLUG =
  /\b(?:grok-\d+(?:\.\d+)?|claude-(?:opus|sonnet|haiku)[-\w.]*|gpt-[\d.]+|composer-[\d.]+|muse-[\w.-]+|gemini-[\d.]+|cursor-grok-[\w.-]+)(?:\[[^\]]*\])?/gi
const INHERIT_PIN = /model:\s*inherit(?:\[[^\]]*\])?/g
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

function walk(directory, output = []) {
  if (!existsSync(directory)) return output
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) walk(path, output)
    else if (/\.(md|mdc)$/.test(name)) output.push(path)
  }
  return output
}

function hitsIn(text) {
  const slugs = [...text.matchAll(MODEL_SLUG)].map((m) => m[0])
  const pins = [...text.matchAll(INHERIT_PIN)].map((m) => m[0])
  return [...slugs, ...pins]
}

test("agent frontmatter is the only hard-coded subagent model source", () => {
  const agents = walk(AGENTS_DIR)
  assert.ok(agents.length > 0, ".cursor/agents must define pinned models")
  for (const path of agents) {
    const text = readFileSync(path, "utf8")
    const frontmatter = text.match(FRONTMATTER_RE)
    assert.ok(frontmatter, `${relative(ROOT, path)} needs frontmatter`)
    assert.match(
      frontmatter[1],
      /^model:\s+\S+/m,
      `${relative(ROOT, path)} must pin model: in frontmatter`,
    )
  }

  const leaked = []
  for (const directory of SCAN_DIRS) {
    for (const path of walk(directory)) {
      const rel = relative(ROOT, path)
      const found = hitsIn(readFileSync(path, "utf8"))
      if (found.length) leaked.push(`${rel}: ${found.join(", ")}`)
    }
  }
  assert.deepEqual(leaked, [])
})

test("agent frontmatter regex accepts CRLF and LF", () => {
  const lf = "---\nmodel: inherit\n---\n# Agent\n"
  const crlf = "---\r\nmodel: inherit\r\n---\r\n# Agent\r\n"
  assert.match(lf, FRONTMATTER_RE)
  assert.match(crlf, FRONTMATTER_RE)
  assert.match(crlf.match(FRONTMATTER_RE)[1], /^model:\s+\S+/m)
})

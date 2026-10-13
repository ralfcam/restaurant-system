import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, test } from "node:test"

const ROOT = process.cwd()
const MODEL_SLUG_RE =
  /\b(?:grok-\d|claude-|composer-|gpt-\d|sonnet-\d|opus-\d|model:\s*inherit)\b/i

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

describe("agent-model-source", () => {
  test("every agent file has a model: frontmatter line", () => {
    const agents = walk(join(ROOT, ".cursor", "agents")).filter((p) =>
      p.endsWith(".md"),
    )
    assert.ok(agents.length > 0)
    for (const file of agents) {
      const text = readFileSync(file, "utf8")
      assert.match(
        text,
        /^---[\s\S]*?\nmodel:\s+\S+/m,
        `${file} is missing a model: frontmatter line`,
      )
    }
  })

  test("commands do not name a subagent model slug", () => {
    const files = walk(join(ROOT, ".cursor", "commands")).filter((p) =>
      p.endsWith(".md"),
    )
    const hits = []
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n")
      lines.forEach((line, i) => {
        if (MODEL_SLUG_RE.test(line))
          hits.push(`${file}:${i + 1}:${line.trim()}`)
      })
    }
    assert.deepEqual(hits, [])
  })
})

#!/usr/bin/env node
/**
 * Gate-evidence CLI for /push and /intake.
 *   head                         body on stdin; prints the SHA, or exits 1
 *   replace --head <sha> --result <pass|merged origin/staging>
 *                                body on stdin; prints the new body
 */
import { readFileSync } from "node:fs"
import {
  gateEvidenceHead,
  renderGateEvidence,
  replaceGateEvidence,
} from "../hooks/lib/gate-evidence-policy.mjs"

const [command, ...rest] = process.argv.slice(2)
const body = readFileSync(0, "utf8")

function flag(name) {
  const index = rest.indexOf(name)
  return index === -1 ? "" : rest[index + 1] || ""
}

if (command === "head") {
  const head = gateEvidenceHead(body)
  if (!head) process.exit(1)
  process.stdout.write(`${head}\n`)
  process.exit(0)
}

if (command === "replace") {
  const head = flag("--head")
  const result = flag("--result")
  if (!/^[0-9a-f]{40}$/.test(head)) {
    console.error(
      "usage: replace --head <40-hex> --result <pass|merged origin/staging>",
    )
    process.exit(2)
  }
  if (result !== "pass" && result !== "merged origin/staging") {
    console.error(
      "usage: replace --head <40-hex> --result <pass|merged origin/staging>",
    )
    process.exit(2)
  }
  process.stdout.write(
    replaceGateEvidence(body, renderGateEvidence({ head, result })),
  )
  process.exit(0)
}

console.error(
  "usage: node .cursor/checks/gate-evidence.mjs head | replace --head <sha> --result <pass|merged origin/staging>",
)
process.exit(2)

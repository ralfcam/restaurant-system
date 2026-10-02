#!/usr/bin/env node
/**
 * Ready-brief completeness CLI. Exit 0 when the brief is complete.
 * Usage: node .cursor/checks/ready-brief.mjs <file>
 *        node .cursor/checks/ready-brief.mjs -
 */
import { readFileSync } from "node:fs"
import {
  isCompleteBrief,
  missingBriefParts,
  parseReadyBrief,
} from "../hooks/lib/ready-brief-policy.mjs"

const file = process.argv[2]
if (!file) {
  console.error("usage: node .cursor/checks/ready-brief.mjs <file>|-")
  process.exit(2)
}

const text = file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8")
const brief = parseReadyBrief(text)
const missing = missingBriefParts(brief)
const complete = isCompleteBrief(brief)
console.log(JSON.stringify({ complete, route: brief.route, missing }))
process.exit(complete ? 0 : 1)

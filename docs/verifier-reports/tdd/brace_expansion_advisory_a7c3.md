# TDD log: brace_expansion_advisory_a7c3

FIX run. Free-text advisory inside RES-139. No START comment and no close-out comment. `/commit` must omit a closing magic word. RES-139 stays open.

This file is a **reading guide for `/commit`**, not a verdict.

### G-AUD2

Suggested review order:
- Patched v5 override pin
  - `pnpm-workspace.yaml:2` [security]
  - `pnpm-lock.yaml:109` [security]
  - `pnpm-lock.yaml:1849`
  - `pnpm-lock.yaml:6779` [security]
- Keep the 1.x line on minimatch 3
  - `pnpm-workspace.yaml:3`
  - `pnpm-lock.yaml:110`
  - `pnpm-lock.yaml:6783`
- hono override unchanged
  - `pnpm-workspace.yaml:4`
  - `pnpm-lock.yaml:111`
- Incidental postcss dedupe left in place
  - `pnpm-lock.yaml:195`
Reusable pattern: When a pnpm override must lift one major and keep an older major, pair the bare pin with a `name@<major>` selector (`brace-expansion: 5.0.7` plus `"brace-expansion@1": 1.1.15`) so minimatch 3 is not rewritten onto 5.x.

## Suggested Review Order (collated)

Highest-risk first. One concern: the override that removes GHSA-3jxr-9vmj-r5cp (`>=3.0.0 <5.0.7`) without moving the 1.x line.

1. **Patched v5 pin [security]**
   - `pnpm-workspace.yaml:2` — `brace-expansion: 5.0.7`
   - `pnpm-lock.yaml:109` — lockfile override matches
   - `pnpm-lock.yaml:1849` — resolved `brace-expansion@5.0.7`
   - `pnpm-lock.yaml:6779` — `minimatch@10.2.5` depends on `brace-expansion: 5.0.7`
2. **1.x line kept for minimatch 3**
   - `pnpm-workspace.yaml:3` — `"brace-expansion@1": 1.1.15`
   - `pnpm-lock.yaml:110` — lockfile major selector
   - `pnpm-lock.yaml:6783` — `minimatch@3.1.5` still depends on `brace-expansion: 1.1.15`
3. **Unchanged neighbors**
   - `pnpm-workspace.yaml:4` and `pnpm-lock.yaml:111` — `hono: 4.12.25` stays
   - `pnpm-lock.yaml:195` — postcss importer moved `8.5.6` → `8.5.23` inside the existing `^8.5` range; left in place
- Pin: `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts` — `brace-expansion override is at least 5.0.7`

## Traceability (final)

Run: 2026-10-05 · plan: brace_expansion_advisory_a7c3 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-AUD2 | dev-toolchain.md G-AUD2 | pnpm-overrides-toolchain.test.ts::brace-expansion override is at least 5.0.7 | pnpm-workspace.yaml, pnpm-lock.yaml | P0 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: brace_expansion_advisory_a7c3
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: n/a — no new run-file line; later brace-expansion advisories stay on RES-139; STEP 4C skipped

## Reusable patterns (4E)

1. **Major-scoped pnpm override** — pair a bare pin (`brace-expansion: 5.0.7`) with `"brace-expansion@1": 1.1.15` so minimatch 3 keeps the 1.x function export.

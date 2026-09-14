# TDD log — g-cr2_4g_soften_761b7912

FIX: G-CR2 4G soften — recorded-not-blocking classes + `pull_changed` + workflow `edited` + untrusted handoff argv.

### C1

Suggested review order:
- recorded-not-blocking dispatch (before waivers) `[security]`
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:303` `applyWaivers` → `isRecordedNotBlocking` before fingerprint set
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:173` `isRecordedNotBlocking` OR of three classes
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:134` `findingBody` first-wins; reused by fingerprint
- spec-structure class (wide `docs/specs/` prefix) `[security]`
  - `isSpecStructureClass` — split∧G-CR2/G-CR3∧subcriteria OR move∧relocate-marker∧trace/runbook
- 98fd7524-class runbook mint
  - `isRunbookMintClass` — exact `docs/runbooks/coderabbit.md` ∧ dual-omission ∧ (non-empty `complete.reviewedFiles` ∨ complete-list mint)
- `--undo` without `<n>`
  - `isUndoWithoutNClass` — exact ready-merge command path ∧ Step 4 ∧ `gh pr ready --undo` ∧ omit ∧ PR number
- still-blocking controls
  - test pr-gate adapter major → `unresolved_findings`
  - test vacuous specs major → `unresolved_findings`

Reusable pattern: Recorded-not-blocking needs a body class plus a still-blocking sibling fixture; applyWaivers classifies before fingerprint waivers; fingerprints stay on raw first-wins body.

### C2

Suggested review order:
- post-pagination fail-closed (SHA then shape vs **initial** `pull`) `[security]`
  - `.cursor/checks/coderabbit-pr-gate.mjs:253` in-body re-GET
  - `.cursor/checks/coderabbit-pr-gate.mjs:254-256` `head_changed`
  - `.cursor/checks/coderabbit-pr-gate.mjs:257-262` `pull_changed`
- adapter CLI reason mapping `[public-api]`
  - `.cursor/checks/coderabbit-pr-gate.mjs:315-325` `main().catch`
- executed pins
  - `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:158` target `it`
  - same file duplicate SHA `it` titles (do not rename)

Reusable pattern: After pagination, re-GET the pull in-body; throw `head_changed` on SHA mismatch first, then `pull_changed` when `head.ref` / `base.ref` / `draft` differ from the initial pull.

### C3

Suggested review order:
- Trigger contract [security]
  - `.github/workflows/coderabbit-main-gate.yml:12` — `on.pull_request.types` includes `edited`
  - `.github/workflows/coderabbit-main-gate.yml:3-8` — header: thread is not an Actions trigger; `edited` = title/body or base retarget
- Pin (slice, not file-wide `/edited/`)
  - `.cursor/checks/coderabbit-pr-policy.test.mjs:78-95`

Reusable pattern: Pin a workflow activity type by slicing the named `on.<event>:` block and parsing that flow-sequence `types:` list; do not add a file-wide needle that already appears on a sibling event.

### C4

Suggested review order:
- Untrusted argv `[security]`
  - `.cursor/commands/ready-merge-release.md:43` opaque local ref only
  - `.cursor/commands/ready-merge-release.md:83` `/sdd-to-tdd` fence (`<local-ref>`)
  - `.cursor/commands/ready-merge-release.md:86` `/capture` fence (`<local-ref>`)
- Inert report (not argv)
  - `.cursor/commands/ready-merge-release.md:84` sdd inert fields
  - `.cursor/commands/ready-merge-release.md:87` capture inert + provenance
- Routing `[public-api]`
  - Critical/Major/unknown → `/sdd-to-tdd`; Minor/Trivial → `/capture`

Reusable pattern: Pin paste-ready slash commands as inline-backtick fences whose only extra slot is `<local-ref>`; put remote id/path/title/severity on the next line as inert report.

## Suggested Review Order (collated)

Highest-risk first.

1. **Recorded-not-blocking vs still-blocking sibling [security]** — `.cursor/hooks/lib/coderabbit-review-policy.mjs` `applyWaivers` / `isRecordedNotBlocking`: spec-structure, 98fd7524-class runbook mint, and `--undo` without `<n>` go to `nonBlocking`; adapter major on `coderabbit-pr-gate.mjs` and vacuous `docs/specs/**` majors still `unresolved_findings`.
2. **`pull_changed` [security]** — `.cursor/checks/coderabbit-pr-gate.mjs` `fetchSnapshot`: SHA `head_changed` first, then `head.ref` / `base.ref` / `draft` vs the initial pull; CLI catch maps `pull_changed` like `head_changed`.
3. **Untrusted handoff argv [security]** — `.cursor/commands/ready-merge-release.md` Step 2: executable `/sdd-to-tdd` and `/capture` use `<local-ref>` only; remote finding-id/path/title/severity stay inert prose.
4. **Workflow `edited` [schema]** — `.github/workflows/coderabbit-main-gate.yml` `on.pull_request.types` includes `edited`; pin slices the `pull_request:` types list, not file-wide `/edited/`.

## Traceability (final)

Run: 2026-09-14 · plan: g-cr2_4g_soften_761b7912 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR2 §8 recorded-not-blocking | coderabbit-review-policy.test.mjs::spec-structure and ledger-class findings are recorded not unresolved_findings | `.cursor/hooks/lib/coderabbit-review-policy.mjs` `applyWaivers` | P1 | shipped |
| C2 | G-CR3 §9 `pull_changed` | coderabbit-gcr3-mustfixes.test.ts::fetchSnapshot fails pull_changed when base ref head ref or draft moves with sha unchanged | `.cursor/checks/coderabbit-pr-gate.mjs` `fetchSnapshot` | P1 | shipped |
| C3 | G-CR3 §9 workflow `edited` | coderabbit-pr-policy.test.mjs::main-gate workflow is read-only, staging→main, and named US latest-head | `.github/workflows/coderabbit-main-gate.yml` | P1 | shipped |
| C4 | G-CR3 §9 untrusted handoff argv | coderabbit-gcr3-mustfixes.test.ts::ready-merge handoff commands omit remote finding fields | `.cursor/commands/ready-merge-release.md` | P1 | shipped |

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: g-cr2_4g_soften_761b7912
Criteria: 4 shipped · 0 manual-uat · 4 total
Phases delegated: 12
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 20 left on ledger (below floor/cap) — cap 3/run

# TDD verifier report — Cloud SDLC harness (`cloud_sdlc_harness_closeout`)

FEATURE close-out. No Linear issue. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict.

The criteria were already green in the working tree. This run did not delegate Red, Green, or Refactor. Re-entering Green would have treated the shipped source as pre-RED and reverted it. `shipped` below is stamped from this execution turn's re-run, not from an earlier report.

G-LG1 stays the existing deferral and is not a row here. A PR CI workflow stays a follow-up. Neither is a new ledger line.

## Criterion close-outs (incremental)

### G-CON1 — `/conduct` is managed Cloud only

Suggested review order: `[toolchain]` `.cursor/commands/conduct.md:25` (Todo queue and `Work started:` claim) → `.cursor/commands/conduct.md:124` (`cursor/res-<n>-` branch) → `.cursor/commands/push.md` (managed `staging`/`main` stop and duplicate issue PR)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-RDY1 — Ready briefs

Suggested review order: `[toolchain]` `.cursor/hooks/lib/ready-brief-policy.mjs:16` (`field`, no lane labels) → `.cursor/checks/ready-brief.mjs` (stdin `-`) → `.cursor/agents/linear-resolver.md` (READY brief-only stale guard)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-DSP1 — Dispatch Cloud lane

Suggested review order: `[toolchain]` `.cursor/commands/dispatch.md` (`Cloud lane: Ready briefs`, example briefs) → `.cursor/rules/staging-accumulator.mdc` (complete brief on a Todo issue)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-PUB1 — Cloud PR publication lanes

Suggested review order: `[toolchain]` `.cursor/hooks/lib/tdd-guard-policy.mjs:229` (`addedPathsFromGit`) → `.cursor/hooks/lib/tdd-guard-policy.mjs:262` (`designSpecCommitOk`) → `.cursor/checks/gate-evidence.mjs` → `.cursor/commands/intake.md` (drop a matching head before counting)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-ENV1 — Cloud test stack

Suggested review order: `[toolchain]` `.cursor/cloud.Dockerfile` (`unzip`, `sshd_config.d`) → `.cursor/cloud-supabase-up.sh` (override names, key check, Playwright Chromium) → `.cursor/commands/sdd-to-tdd.md` (per-command env prefix)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-DES1 — Briefed design one-shot

Suggested review order: `[toolchain]` `.cursor/commands/design.md` (STEP 0 routes a complete brief to STEP 0C; STEP 0C posts START) → `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-CR4 — `--loop` routes by severity only

Suggested review order: `[toolchain]` `.cursor/checks/coderabbit-pr-policy.test.mjs:128` (unresolved Major to `/capture`, Critical to `/sdd-to-tdd`) → `.cursor/commands/ready-merge-release.md` (`[--loop]` on both adapter commands)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-CUR1 — `/curate` defaults to Plan Mode

Suggested review order: `[toolchain]` `.cursor/commands/curate.md` (missing socket retried once) → `tests/unit/dev-toolchain/curate-command.test.ts`

Reusable pattern: none

Delete-list: Lean already. Ship.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Conductor lane [toolchain]

- `.cursor/commands/conduct.md` — Todo in the current cycle is the queue. A fresh `Work started:` comment is the claim. An open `cursor/res-<n>-<4 hex>` PR is in flight. A blocker before a PR posts one CLARIFY. `morning` commits on `cursor/morning-`.
- `.cursor/commands/push.md` — in a managed VM, stop on `staging` or the default branch. Refuse a second open PR whose head starts with the same `cursor/res-<n>-` prefix.
- Pin: `tests/unit/dev-toolchain/conduct-command.test.ts` — `pins morning, next, stops, hard limits, and never-ask`.

### 2. Ready brief [toolchain]

- `.cursor/hooks/lib/ready-brief-policy.mjs` — completeness is route, spec-or-design-answers, and verification. No lane labels. A blank field does not swallow the next line.
- `.cursor/checks/ready-brief.mjs` — `-` reads stdin.
- `.cursor/agents/linear-resolver.md` READY — replace or append the brief only. The brief the caller read must still match. Never touches labels or state.
- `.cursor/commands/dispatch.md` — writes briefs, not labels. Example briefs are `text` fences so they stay parser-shaped.
- Pin: `.cursor/checks/ready-brief-policy.test.mjs` — `stdin CLI reads a complete brief`. Pin: `tests/unit/dev-toolchain/dispatch-cloud-lane.test.ts` — `replaces parallelization advice with Ready briefs and a dispatch digest`.

### 3. Gate evidence and the design-spec lane [toolchain]

- `.cursor/hooks/lib/gate-evidence-policy.mjs` — the block includes `Gates: pnpm lint; pnpm typecheck; pnpm test:unit - pass`.
- `.cursor/checks/gate-evidence.mjs` — `head` and `replace`. `/push` puts the block in the create body and runs `gh pr edit <n> --body-file` on later `cursor/` pushes. `/intake` drops a matching head before requiring exactly one.
- `.cursor/hooks/lib/tdd-guard-policy.mjs` `addedPathsFromGit` — design-spec commit requires the one spec to be a new file and not `docs/specs/README.md`. `gate open --exempt design-spec` runs before that commit.
- Pin: `tests/unit/dev-toolchain/push-gate-evidence.test.ts` — `the CLI prints a head and replaces a body`. Pin: `.cursor/checks/tdd-guard-policy.test.mjs` — `docs-artifact admits plan files and design-spec is one spec`. Pin: `.cursor/checks/intake-ancestry.test.mjs` — `push.md names the same ancestry commands for cursor heads`.

### 4. Cloud test stack [toolchain]

- `.cursor/cloud.Dockerfile` — `mkdir -p /etc/ssh/sshd_config.d` before the sshd write, and `unzip` in the first apt list.
- `.cursor/cloud-supabase-up.sh` — maps `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, fails closed if one is missing, then installs Playwright Chromium.
- `.cursor/commands/sdd-to-tdd.md` — Linux Cloud VM only. Each integration or e2e phase command is prefixed with `set -a; . supabase/.temp/cloud-test.env; set +a`.
- Pin: `tests/unit/dev-toolchain/cloud-test-stack.test.ts` — `keeps the install string and adds Docker start plus the supabase helper`.

### 5. Briefed design and loop routing [toolchain]

- `.cursor/commands/design.md` STEP 0C — a complete design brief writes the work-order first and posts START in the background. STEP 0B stays interactive.
- `.cursor/commands/ready-merge-release.md` — `/ready-merge-release <PR> [--loop]`. Critical and unknown go to `/sdd-to-tdd`. Major, Minor, and Trivial go to `/capture`.
- `.cursor/commands/curate.md` — defaults to Plan Mode. A missing socket is retried once.
- Pin: `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` — `pins the briefed STEP 0C one-shot without dropping interactive stops`. Pin: `.cursor/checks/coderabbit-pr-policy.test.mjs` — `loop mode routes an unresolved Major thread to /capture and Critical to /sdd-to-tdd`. Pin: `tests/unit/dev-toolchain/curate-command.test.ts` — `pins Plan Mode reads, guards, scopes, memory, and the digest cap`.

## Traceability (final)

Run: 2026-10-02 · plan: cloud_sdlc_harness_closeout · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-ENV1 | dev-toolchain.md criterion 22 | `cloud-test-stack.test.ts::keeps the install string and adds Docker start plus the supabase helper` | `.cursor/cloud.Dockerfile`; `.cursor/cloud-supabase-up.sh`; `.cursor/commands/sdd-to-tdd.md`; `.cursor/environment.json` | P1 | shipped |
| G-PUB1 | dev-toolchain.md criterion 16 | `push-gate-evidence.test.ts::the CLI prints a head and replaces a body`; `tdd-guard-policy.test.mjs::docs-artifact admits plan files and design-spec is one spec`; `intake-ancestry.test.mjs::push.md names the same ancestry commands for cursor heads` | `.cursor/hooks/lib/gate-evidence-policy.mjs`; `.cursor/checks/gate-evidence.mjs`; `.cursor/hooks/lib/tdd-guard-policy.mjs`; `.cursor/commands/push.md`; `.cursor/commands/intake.md`; `.cursor/commands/commit.md` | P1 | shipped |
| G-RDY1 | dev-toolchain.md criterion 18 | `ready-brief-policy.test.mjs::stdin CLI reads a complete brief` | `.cursor/hooks/lib/ready-brief-policy.mjs`; `.cursor/checks/ready-brief.mjs`; `.cursor/agents/linear-resolver.md` | P1 | shipped |
| G-DSP1 | dev-toolchain.md criterion 19 | `dispatch-cloud-lane.test.ts::replaces parallelization advice with Ready briefs and a dispatch digest` | `.cursor/commands/dispatch.md`; `.cursor/rules/staging-accumulator.mdc`; `.cursor/README.md` | P1 | shipped |
| G-CON1 | dev-toolchain.md criterion 20 | `conduct-command.test.ts::pins morning, next, stops, hard limits, and never-ask` | `.cursor/commands/conduct.md`; `.cursor/commands/push.md` | P1 | shipped |
| G-CR4 | dev-toolchain.md criterion 21 | `coderabbit-pr-policy.test.mjs::loop mode routes an unresolved Major thread to /capture and Critical to /sdd-to-tdd` | `.cursor/hooks/lib/coderabbit-pr-policy.mjs`; `.cursor/commands/ready-merge-release.md` | P1 | shipped |
| G-DES1 | dev-toolchain.md criterion 13 | `design-cloud-dialogue.test.ts::pins the briefed STEP 0C one-shot without dropping interactive stops` | `.cursor/commands/design.md` | P1 | shipped |
| G-CUR1 | dev-toolchain.md criterion 15 | `curate-command.test.ts::pins Plan Mode reads, guards, scopes, memory, and the digest cap` | `.cursor/commands/curate.md` | P2 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-10-02 → 2026-10-02 · plan: cloud_sdlc_harness_closeout
Criteria: 8 shipped · 0 manual-uat · 8 total
Phases delegated: 0
Back-loops: none
BLOCKED events: none
Issues: n/a — this run produced no findings; STEP 4C skipped. The standing ledger is not this run's work.

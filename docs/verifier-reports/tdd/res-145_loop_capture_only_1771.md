# TDD log — res-145_loop_capture_only_1771

## C1 — loop exempt-plan plus body findings

Suggested review order:
- Loop verdict after product threads [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:716`
- Body finding route [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:534`
- Exempt plan threads deduped ahead of body ids [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:552`
- Prompt-to-fix strip and file-block slice
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:458`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:476`
- Gate header stays read-only [public-api]
  - `.cursor/checks/coderabbit-pr-gate.mjs:4`

Reusable pattern: CodeRabbit `<details>` slices that start at `<summary>` must begin depth at 1, because the opening `<details>` is already behind the index.

Re-verify (orchestrator): `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs` 39 pass, 0 fail, 0 skipped. `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts tests/unit/dev-toolchain/conduct-command.test.ts` 2 files, 26 pass, 0 skipped. `pnpm lint` clean (`eslint . --max-warnings 0`). `pnpm typecheck` clean (`tsc --noEmit`).

## Suggested Review Order (collated)

- `--loop` branch after `captured_threads_resolved` [security] → `.cursor/hooks/lib/coderabbit-pr-policy.mjs:716` (`capture_only_findings` / `changes_requested_body_findings`)
- Product-path body findings use loop routing; plan paths stay `/capture` [security] → `.cursor/hooks/lib/coderabbit-pr-policy.mjs:534`
- Exempt threads are collected before body ids so a shared id keeps the thread [security] → `.cursor/hooks/lib/coderabbit-pr-policy.mjs:552`
- Prompt-to-fix exclusion and the file `<details>` slice → `.cursor/hooks/lib/coderabbit-pr-policy.mjs:458`, `:476`
- Adapter header stays read-only [public-api] → `.cursor/checks/coderabbit-pr-gate.mjs:4`
- Spec → `docs/specs/dev-toolchain.md` G-CR4

## Traceability (final)

Run: 2026-10-09 · plan: res-145_loop_capture_only_1771 · issue: RES-145

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | dev-toolchain.md G-CR4 | .cursor/checks/coderabbit-pr-policy.test.mjs::loop exempt plan thread plus body minor is capture_only_findings | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P0 | shipped |

## Run metrics

Run: 2026-10-09 → 2026-10-09 · plan: res-145_loop_capture_only_1771
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached · 4 left on ledger (1 security med above floor, attach-only; 3 below floor) — cap 3/run

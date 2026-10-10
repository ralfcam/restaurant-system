# TDD log — res-126_absolute_normalize_bf39

## C1 — absolute checkout path denied while armed in red

Suggested review order: checkout-root relativize before the protected-prefix match [security] .cursor/hooks/lib/tdd-guard-policy.mjs:319 (slash-normalize) → :320-321 (strip only this checkout) → :322 (single leading-slash cleanup)

Reusable pattern: Slash-normalize, then strip a prefix only when it equals `join(__dirname, "..", "..", "..")` (module-located checkout root, same join-up as `STATE_PATH`); never key the strip off a repo folder name.

Re-verify (orchestrator, 2026-10-09): `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` — 1 file, 2 passed, 0 skipped. `pnpm lint` (`eslint . --max-warnings 0`) exit 0. `pnpm typecheck` (`tsc --noEmit`) exit 0. `pnpm exec prettier --check .cursor/hooks/lib/tdd-guard-policy.mjs` exit 0.

## Suggested Review Order (collated)

- Checkout-root relativize before the protected-prefix match [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs:319` slash-normalize, `:320-321` strip only when the path is this checkout (`join(__dirname, "..", "..", "..")`), `:322` one leading-slash cleanup
- G-TD1 item 1 names the absolute and backslash deny → `docs/specs/dev-toolchain.md` G-TD1
- Spawn of both path shapes → `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` "absolute checkout path of a protected file is denied while armed in red"

## Traceability (final)

Run: 2026-10-09 · plan: res-126_absolute_normalize_bf39 · issue: RES-126

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | docs/specs/dev-toolchain.md G-TD1 item 1 | tests/unit/dev-toolchain/tdd-guard-liveness.test.ts::absolute checkout path of a protected file is denied while armed in red | .cursor/hooks/lib/tdd-guard-policy.mjs normalize | P0 | shipped |

## Run metrics

Run: 2026-10-09 → 2026-10-09 · plan: res-126_absolute_normalize_bf39
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor) — cap 3/run

# TDD verifier report — hermetic OH-SAVE unit pin (`oh-save_pin_hermetic_2088c96a`)

FIX run. Free-text `bug:` from `/push` — no Linear source ID. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — OH-SAVE-ISO-UNIT

Suggested review order:
- Isolation resolve + fail-closed throw **[security]**
  `lib/scheduling/hours-mutation-target.ts:14`
  `lib/scheduling/hours-mutation-target.ts:15`
  `lib/scheduling/hours-mutation-target.ts:28-33`
- Env stub + restore **[security]**
  `tests/unit/scheduling/hours-mutation-target.test.ts:13-14`
  `tests/unit/scheduling/hours-mutation-target.test.ts:47-53`
- Omitted URL follows env
  `tests/unit/scheduling/hours-mutation-target.test.ts:22-29`
- Explicit URL wins while env is local
  `tests/unit/scheduling/hours-mutation-target.test.ts:31-46`

Reusable pattern: When pinning omitted-URL env fallback, wrap `NEXT_PUBLIC_SUPABASE_URL` in try/finally and `delete` the key if it was previously `undefined` (assigning `undefined` does not remove it in Node).

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Spec §15 omitted-vs-explicit contract `[security]`

- `docs/specs/scheduling.md` §15 — isolation helper resolves optional explicit URL, otherwise `NEXT_PUBLIC_SUPABASE_URL`; omitted/`undefined` is the runner pin; explicit URL wins over env

### 2. Isolation resolve + fail-closed throw `[security]`

- `lib/scheduling/hours-mutation-target.ts:14` — `url ?? process.env.NEXT_PUBLIC_SUPABASE_URL` (unchanged this run; do not make omitted `undefined` ignore env)
- `lib/scheduling/hours-mutation-target.ts:15` — missing/empty resolved URL → `null` → throw
- `lib/scheduling/hours-mutation-target.ts:28-33` — `assertIsolatedHoursMutationTarget` fail-closed throw

### 3. Env stub + restore `[security]`

- `tests/unit/scheduling/hours-mutation-target.test.ts:13-14` — save prior `NEXT_PUBLIC_SUPABASE_URL` before mutating process env
- `tests/unit/scheduling/hours-mutation-target.test.ts:47-53` — restore or `delete` in `finally` (assigning `undefined` does not remove the key in Node)

### 4. Omitted URL follows env

- `tests/unit/scheduling/hours-mutation-target.test.ts:22-29` — local env + omitted/`undefined` does not throw; deleted or `""` env + omitted throws

### 5. Explicit URL wins while env is local

- `tests/unit/scheduling/hours-mutation-target.test.ts:31-46` — explicit linked-project / other remote / `""` throw even when env is local; explicit `127.0.0.1` / `localhost` / `[::1]` still allow

## Traceability (final)

Run: 2026-08-28 · plan: oh-save_pin_hermetic_2088c96a · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md §15 OH-SAVE (omitted-vs-explicit) | hours-mutation-target.test.ts::omitted url follows env; explicit url wins even when env is local | lib/scheduling/hours-mutation-target.ts (unchanged) | P1 | shipped |

## Run metrics

Run: 2026-08-28 → 2026-08-28 · plan: oh-save_pin_hermetic_2088c96a
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 4 left on ledger (below floor/cap) — cap 3/run

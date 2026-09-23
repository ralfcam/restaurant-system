# TDD log — mt4b_windows_glob_pin_7c2a9e14

### C1

Suggested review order:
- STRICT pin contract (normalize `\\` to `/`, keep live `globSync`): docs/specs/menu-availability.md:121
- Live `globSync` containment after separator normalize: tests/unit/menu/menus-integ-strict.test.ts:25

Reusable pattern: Before a `toContain` of a `/` path literal, map live `globSync(include)` hits with `replaceAll("\\", "/")`.

## Suggested Review Order (collated)

Highest-risk first. A red pin blocks every `/push`.

- **Separator-normalized STRICT pin**
  - `tests/unit/menu/menus-integ-strict.test.ts:25` — live `globSync` hits mapped with `replaceAll("\\", "/")` before `toContain` of `tests/integration/menu/menus-privileges.integ.test.ts`
- **MT-4b contract**
  - `docs/specs/menu-availability.md:121` — normalize each hit's `\\` to `/` and keep the live `globSync(include)` call

## Traceability (final)

Run: 2026-09-23 · plan: mt4b_windows_glob_pin_7c2a9e14 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | menu-availability.md MT-4b | tests/unit/menu/menus-integ-strict.test.ts::menus privilege integ is covered by STRICT fail-closed setup | — | P1 | shipped |

## Run metrics

Run: 2026-09-23 → 2026-09-23 · plan: mt4b_windows_glob_pin_7c2a9e14
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 0 left on ledger — cap 3/run

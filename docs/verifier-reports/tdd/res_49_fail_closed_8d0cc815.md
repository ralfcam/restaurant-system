# TDD verifier report — res_49_fail_closed_8d0cc815

FIX run. Linear: [RES-49](https://linear.app/realized/issue/RES-49/restaurant-system-blocked-dates-readers-fail-open-on-select-errors).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — BD-READ-FAIL

Suggested review order:
- Fail-closed contract [booking] `app/actions/availability.ts:45` `BLOCKED_DATES_LOAD_ERROR`
- Shared reject helper [booking] `app/actions/availability.ts:47`
- `isDateBlocked` error branch [booking] `app/actions/availability.ts:96`
- `getBlockedDatesInMonth` error branch `app/actions/availability.ts:120`
- `getBlockedDatesInRange` error branch `app/actions/availability.ts:163`
- Confirm `isSchemaCacheError` is unused by the three readers (`app/actions/availability.ts:33`, still only `toggleBlockedDate`)
- Success empty/data: `isDateBlocked` `data !== null` (`:100`); list `(data ?? []).map` (`:124`, `:166`)
- Regression: `tests/unit/availability/actions.test.ts` (`blocked-date readers reject SELECT errors without changing successful results`)
- Caller blast (read-only): `app/actions/reservations.ts:86` `createReservation`; `:660` `getAvailableSlots`

Reusable pattern: Pin a safety-critical Supabase SELECT with both a non-empty returned-error fixture and successful empty/null/data cases in one test so `false`/`[]` cannot hide a query failure.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Data-integrity contract `[booking]`

- `docs/specs/booking-rules.md` §24 BD-READ-FAIL — any non-null `blocked_dates` SELECT `error` must log server-side and throw `Error("Could not load blocked dates.")`; MUST NOT resolve `false` or `[]`; caller UX is excluded
- `app/actions/availability.ts:45` — `BLOCKED_DATES_LOAD_ERROR` stable public message
- `app/actions/availability.ts:47` — `rejectBlockedDatesRead` logs `{operation} error:` + backend `message`, then throws
- `app/actions/availability.ts:96` — `isDateBlocked` `if (error)` → `return rejectBlockedDatesRead(...)`
- `app/actions/availability.ts:120` — `getBlockedDatesInMonth` same
- `app/actions/availability.ts:163` — `getBlockedDatesInRange` same
- `app/actions/availability.ts:33` — `isSchemaCacheError` is **not** a reader carve-out (still `toggleBlockedDate` only)

### 2. Regression proof

- `tests/unit/availability/actions.test.ts` → `blocked-date readers reject SELECT errors without changing successful results`
- Non-42501 `XX000` returned-error fixture for all three readers, then successful row / null / mapped ISO dates / `[]` only on empty/null data
- Anon `createClient().from("blocked_dates")` chainable/thenable harness

### 3. Success semantics unchanged

- `app/actions/availability.ts:100` — `isDateBlocked` returns `data !== null`
- `app/actions/availability.ts:124` / `:166` — list readers `(data ?? []).map((row) => row.date as string)`
- Anon-client queries and success return types retained

### 4. Caller blast (out of scope; read-only)

- `app/actions/reservations.ts` `createReservation` / `getAvailableSlots` still assume boolean/`string[]`
- `components/site/reservation-widget.tsx` / scheduling calendar — no catch/finally recovery UI (criterion 24 exclusion)

## Traceability (final)

Run: 2026-09-10 · plan: res_49_fail_closed_8d0cc815 · issue: RES-49

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 BD-READ-FAIL | booking-rules.md §24 BD-READ-FAIL | `actions.test.ts::blocked-date readers reject SELECT errors without changing successful results` | `app/actions/availability.ts` | P0 | shipped |

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: res_49_fail_closed_8d0cc815
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 3 left on ledger (1 security med above floor awaiting operator yes; 2 below floor) — cap 3/run

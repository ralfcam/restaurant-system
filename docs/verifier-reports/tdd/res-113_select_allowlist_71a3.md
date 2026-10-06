# TDD log — res-113_select_allowlist_71a3

## C1 — RA-10 reservations SELECT allowlist

Suggested review order:
- Reservations column allowlist **[security]**: `app/actions/analytics.ts:24` — `RESERVATION_ANALYTICS_SELECT` is exactly `id, status, date, completed_at, time, party_size`, passed to `.select()` at line 79.
- Staff gate before the service-role read **[auth]**: `app/actions/analytics.ts:70` — `requireStaffUser` runs before `createServiceClient`, which bypasses RLS.
- Runtime argument pin: `tests/unit/analytics/staff-page.test.ts:186` — the recording chain stores that argument; the exact-string assertion is at line 221.

Reusable pattern: Pin a PostgREST allowlist with a recording chain that stores the `.select()` argument; the shared thenable returns `() => self` and drops it, so a JSON-key assertion cannot prove the list.

## Suggested Review Order (collated)

Highest-risk first.

- **[security]** Reservations SELECT allowlist — `app/actions/analytics.ts:24` (`RESERVATION_ANALYTICS_SELECT` = `id, status, date, completed_at, time, party_size`); `app/actions/analytics.ts:79` (that constant is the `.select()` argument).
- **[auth]** Staff gate before the service-role client — `app/actions/analytics.ts:70` (`requireStaffUser` before `createServiceClient`).
- Runtime pin — `tests/unit/analytics/staff-page.test.ts:186` (recording chain) and `:221` (exact allowlist string). The shared `thenable` still ignores `.select()`; this test does not use it.

## Traceability (final)

Run: 2026-10-06 · plan: res-113_select_allowlist_71a3 · issue: RES-113

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | reservation-analytics.md RA-10 | tests/unit/analytics/staff-page.test.ts::reservations analytics select is an explicit column allowlist | app/actions/analytics.ts | P0 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-113_select_allowlist_71a3
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: n/a

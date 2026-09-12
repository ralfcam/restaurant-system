# TDD verifier report — reservation analytics (`analytics_tdd_wave_44867fc0`)

FEATURE run. Linear: [RES-93](https://linear.app/realized/issue/RES-93).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — RA-1 staff gate

Suggested review order:
- Authz gate **[auth]**: `app/actions/analytics.ts:7-8` — `requireStaffUser` null → `{ error: "Unauthorized." }`, no slice keys
- Privileged client **[security]**: `app/actions/analytics.ts:10-11` — service-role client only after the gate (return still unused until C2)
- Staff chrome: `app/admin/analytics/page.tsx:5-18` — RSC + `StaffShell`, `force-dynamic`
- Nav item: `components/staff/staff-shell.tsx:67-72` — `href: "/admin/analytics"`
- Sidebar group: `components/staff/staff-shell.tsx:80-87` — Service `NAV_GROUPS` includes that href

Reusable pattern: Staff-gated reader unit: hoisted `requireStaffUser` + `createServiceClient` mocks; unauth `{ error: "Unauthorized." }` and no client construction; source-scan page exists + staff-shell `href`. When a fourth `NAV_GROUPS` path overflows printWidth, wrap the array so `prettier --check` stays green.

### C2 — RA-8 fail-closed

Suggested review order:
- Fail-closed Result contract **[public-api]**: `app/actions/analytics.ts:12-13` — exclusive `{ error }` XOR `{ noShow, cancelled }`
- Authz gate **[auth]**: `app/actions/analytics.ts:16` — `requireStaffUser` null → `{ error: "Unauthorized." }` only
- Privileged SELECT **[security]**: `app/actions/analytics.ts:18-19` — service client after the gate; `status` only
- Query-error mapping: `app/actions/analytics.ts:21-23` — log PostgREST `error.message`, stable `Could not load analytics.`
- Empty success: `app/actions/analytics.ts:25` — `{ noShow: 0, cancelled: 0 }` omits `error`

Reusable pattern: Exclusive-union fail-closed reader (`{ error }` XOR zeros) plus sibling `console.error("[analytics] …")` on PostgREST error; pin auth and query-error with `toEqual({ error })` / `not.toEqual({ zeros })`, and empty success with `not.toHaveProperty("error")`

### C3 — RA-3 period

Suggested review order:
- Period reject **[public-api]**: `lib/analytics/report.ts:40-57` — missing/invalid/inverted `from`/`to` → `{ error: "Invalid reporting period." }`
- No privileged query on garbage **[security]**: `app/actions/analytics.ts:26-27` — return that error before `createServiceClient`
- Inclusive presets: `lib/analytics/report.ts:33-36` — `[today-(N-1), today]`; `lib/analytics/report.ts:43` default 7; `lib/analytics/report.ts:59-63` — 30/90
- Inclusive DATE bounds: `app/actions/analytics.ts:32-34` — `.gte("date", from).lte("date", to)`
- Authz before period **[auth]**: `app/actions/analytics.ts:23-24` — unauth never sees period errors
- Calendar-valid ISO: `lib/analytics/report.ts:14-23`

Reusable pattern: Inclusive last-N restaurant-local days via mocked `getTodayInRestaurantTZ` + UTC calendar add of `-(N-1)`; custom range fail-closed on non-YYYY-MM-DD, calendar-invalid days, or `from > to` with `{ error: "Invalid reporting period." }` (never zeros)

### C4 — RA-5 outcomes

Suggested review order:
- Outcomes tally **[public-api]**: `lib/analytics/report.ts:68-79` — exact `no_show` / `cancelled` only
- Outcomes type: `lib/analytics/report.ts:14` — `AnalyticsOutcomes`
- Action compose: `app/actions/analytics.ts:42` — spread helper onto resolved period
- Privileged SELECT **[security]**: `app/actions/analytics.ts:30-35` — `status` only, inclusive `date` bounds
- Authz gate **[auth]**: `app/actions/analytics.ts:24-25` — `requireStaffUser` before period and client

Reusable pattern: Keep the `"use server"` analytics action to auth, period, and SELECT; put the RA-5 status tally in `lib/analytics/report.ts` as a sync helper (same reason as `lib/reservations/validation.ts`) so occupying statuses can sit in the fixture without changing the query.

### C5 — RA-6 duration

Suggested review order:
- Authz gate **[auth]**: `app/actions/analytics.ts:35-36` — `requireStaffUser` null → `{ error: "Unauthorized." }` only
- Period reject **[public-api]**: `app/actions/analytics.ts:38-39` — invalid range returns before any client
- Privileged duration SELECT **[security]**: `app/actions/analytics.ts:64-69` — seated reservation events, `.in(entity_id)` of completed candidates
- Empty `.in()` skip: `app/actions/analytics.ts:50-62` — no completed candidates → no `status_events` round-trip
- Fail-closed mapping **[public-api]**: `app/actions/analytics.ts:15-18`, `:48`, `:71`
- Visit inclusion + half-up **[booking]**: `lib/analytics/report.ts:103-147` — earliest seated → `completed_at`; `sample_count === 0` omits `mean_minutes`; occupancy never read

Reusable pattern: SQL-filter `status_events` with `.eq(entity_type).eq(to_status).in(entity_id, completedIds)` and skip the query when `ids` is empty (PostgREST `in.()` errors); keep the JS predicates because unit thenables ignore filter chains.

### C6 — RA-7 patterns

Suggested review order:
- Authz gate **[auth]**: `app/actions/analytics.ts:42-43` — `requireStaffUser` null → `{ error: "Unauthorized." }` before period/client
- Privileged SELECT **[security]**: `app/actions/analytics.ts:49-53` — `id, status, date, completed_at, time, party_size` only (no `guest_name`/`email`/`phone`)
- Compose patterns **[public-api]**: `app/actions/analytics.ts:86` — `computeBookingPatterns(data, resolved)` on the same in-range rows
- RA-7 histograms **[public-api]**: `lib/analytics/report.ts:177-223` — all statuses by date; weekday via restaurant-TZ helper; hour 0–23 from `HH:MM`; integer `party_size`
- Weekday mock seam: `lib/analytics/report.ts:185-192`, `:205` — catch binding access only; invoke `weekdayOf` outside
- Malformed time: `lib/analytics/report.ts:207-211` — `TIME_RE` + hour 0–23; omit from hour only

Reusable pattern: Isolate a Vitest-missing named export by catching the **binding assignment** (`fn = namedImport`), then invoking the captured function outside the try so production helper throws still propagate — triggered by partial `vi.mock("@/lib/timezone")` that only stubs `getTodayInRestaurantTZ`.

### C7 — RA-4 one period three slices

Suggested review order:
- Combined payload **[public-api]**: `app/actions/analytics.ts:84-89` — one return: period + outcomes + `duration` + `patterns`
- Authz gate **[auth]**: `app/actions/analytics.ts:43-44` — `requireStaffUser` before period/client
- Privileged SELECT **[security]**: `app/actions/analytics.ts:49-54` — service client; no `guest_name`/`email`/`phone`
- Duration-candidate window **[booking]**: `app/actions/analytics.ts:58-68` — completed + `completed_at` + id + in-range date before `.in()`
- Shared range helper: `lib/analytics/report.ts:86-92`
- Outcomes missing-date exception: `lib/analytics/report.ts:104-112`
- Duration skip: `lib/analytics/report.ts:158-161`
- Patterns skip: `lib/analytics/report.ts:206-211`

Reusable pattern: Inclusive YYYY-MM-DD type predicate shared by aggregators and the duration-candidate `.in()` list; keep a documented missing-date exception on status tallies when unit thenables ignore PostgREST `.gte`/`.lte`

### C8 — RA-10 no PII

Suggested review order:
- PII allowlist **[security]**: `app/actions/analytics.ts:23-43` — named SELECT + field pick; extra columns never reach aggregators
- Authz gate **[auth]**: `app/actions/analytics.ts:66-67` — `requireStaffUser` before period/client
- Privileged SELECT **[security]**: `app/actions/analytics.ts:72-77` — service client after the gate; RA-10 column list only
- Compose aggregates **[public-api]**: `app/actions/analytics.ts:110-115` — period + outcomes + duration + patterns; no row spread
- UI surface: `app/admin/analytics/page.tsx:7-18` — no `guest_name`/`email`/`phone` in report body; StaffShell `user.email` is staff chrome

Reusable pattern: Pair an explicit PostgREST SELECT allowlist with a same-shape field pick before aggregators — unit thenables ignore `.select()`, so JSON-key assertions alone only prove reducers do not spread rows

### C9 — RA-2 read-only

Suggested review order:
- Read-only contract **[security]**: `app/actions/analytics.ts:45-56` — RA-2 SELECT-only named next to the other RA clauses
- Authz before I/O **[auth]**: `app/actions/analytics.ts:67-71` — `requireStaffUser` then period reject; no client on either failure
- Privileged reads **[security]**: `app/actions/analytics.ts:73-78` — one service client; reservations allowlist SELECT + inclusive `date` bounds; no insert/update/delete/upsert
- Duration events SELECT **[security]**: `app/actions/analytics.ts:98-108` — `status_events` SELECT only when completed candidate ids exist; skipped empty `.in()`
- Compose, no row write **[public-api]**: `app/actions/analytics.ts:111-116` — aggregates from in-memory rows; `tables` never queried
- Pin (unchanged): `tests/integration/analytics/read-only.integ.test.ts:86-144` — staff-mocked load; counts + SHA-256 of `reservations` / `tables` / `status_events` unchanged

Reusable pattern: Fail-closed analytics integ must set URL/anon/service from `npx supabase status -o env` (`vitest.integration.config.ts` does not load `.env.local`); pin RA-2 with before/after SHA-256 of `reservations`/`tables`/`status_events` rather than inventing a write when the action is already SELECT-only.

### C10 — RA-9 privileges

Suggested review order:
- Privilege lock **[security]**: `supabase/migrations/00000000000000_baseline.sql:132-135` — `REVOKE ALL` from PUBLIC/anon/authenticated; `GRANT INSERT` guest columns only; no `GRANT SELECT` on `reservations`
- Privilege lock **[security]**: `supabase/migrations/00000000000000_baseline.sql:594-606` — `status_events` RLS service_role `FOR ALL`; `REVOKE ALL` from guest roles; `GRANT ALL` to service_role only
- Authz then privileged read **[auth]**: `app/actions/analytics.ts:67-78` — `requireStaffUser` then `createServiceClient()` SELECT allowlist; no user-scoped client
- RA-9 contract note: `app/actions/analytics.ts:45-56` — reader documents denied guest SELECT; never GRANTs
- Live pin after load **[security]**: `tests/integration/analytics/read-only.integ.test.ts:164-210` — staff-mocked analytics load, then anon `createClient().from(…).select()` on `reservations` and `status_events` still empty + permission error

Reusable pattern: When RA-9 is already true in the catalog (`REVOKE ALL`, no `GRANT SELECT`), do not invent a GRANT to force Red; pin after the new staff-mocked reader with a live anon Data API `.select()` (empty rows + 42501/PGRST301). Fail-closed integ must inject URL/anon/service from `npx supabase status -o env` (`vitest.integration.config.ts` does not load `.env.local`).

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from the last Refactor close-out of each criterion (the later C8–C10 pins supersede earlier C1–C7 line numbers on `app/actions/analytics.ts`).

- **[auth]** Staff gate before period, client, or slices — `app/actions/analytics.ts:67-71` (`requireStaffUser` null → `{ error: "Unauthorized." }` only; unauth never sees period errors); period reject before `createServiceClient`
- **[security]** No guest PII on SELECT or aggregators — `app/actions/analytics.ts:23-43` (`RESERVATION_ANALYTICS_SELECT` + field pick); `app/actions/analytics.ts:72-77` (allowlist only); `app/admin/analytics/page.tsx:7-18` (report body has no `guest_name`/`email`/`phone`)
- **[security]** No guest SELECT grant (RA-9) — `supabase/migrations/00000000000000_baseline.sql:132-135` (`reservations` REVOKE ALL + column INSERT only); `supabase/migrations/00000000000000_baseline.sql:594-606` (`status_events` service_role only); `tests/integration/analytics/read-only.integ.test.ts:164-210` (anon SELECT still denied after a staff analytics load)
- **[security]** Read-only application path (RA-2) — `app/actions/analytics.ts:45-56` (SELECT-only contract); `app/actions/analytics.ts:73-78` (reservations SELECT + date bounds, no insert/update/delete); `app/actions/analytics.ts:98-108` (`status_events` SELECT only when completed ids exist); `tests/integration/analytics/read-only.integ.test.ts:86-144` (counts + SHA-256 unchanged)
- **[public-api]** Fail-closed load (RA-8) — exclusive `{ error }` XOR slices; `Could not load analytics.` / `Unauthorized.` / `Invalid reporting period.`; empty success omits `error`
- **[public-api]** One period, three slices (RA-4) — `app/actions/analytics.ts:110-116` (period + outcomes + duration + patterns); leftover metrics must not remain on a later `(from,to)`
- **[booking]** Visit duration (RA-6) — `lib/analytics/report.ts` earliest seated `status_events.created_at` → `completed_at`; half-up minutes; `sample_count === 0` omits `mean_minutes`; occupancy never read
- **[public-api]** Outcomes (RA-5) and patterns (RA-7) — `lib/analytics/report.ts` `countOutcomeStatuses` (`no_show`/`cancelled` only); `computeBookingPatterns` date/weekday/hour/`party_size`; malformed `time` omitted from hour only
- Staff chrome — `app/admin/analytics/page.tsx` (`StaffShell`, `force-dynamic`); `components/staff/staff-shell.tsx` `href: "/admin/analytics"` in Service `NAV_GROUPS`

## Traceability (final)

Run: 2026-09-12 · plan: analytics_tdd_wave_44867fc0 · issue: RES-93

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | reservation-analytics.md RA-1 | tests/unit/analytics/staff-gate.test.ts::staff analytics is gated and linked from staff nav | app/actions/analytics.ts, app/admin/analytics/page.tsx, components/staff/staff-shell.tsx | P0 | shipped |
| C2 | reservation-analytics.md RA-8 | tests/unit/analytics/actions.test.ts::does not present auth or query failure as a successful empty period | app/actions/analytics.ts | P0 | shipped |
| C3 | reservation-analytics.md RA-3 | tests/unit/analytics/actions.test.ts::rejects inverted or invalid period and defaults last 7 restaurant-local days | lib/analytics/report.ts, app/actions/analytics.ts | P1 | shipped |
| C4 | reservation-analytics.md RA-5 | tests/unit/analytics/actions.test.ts::counts only no_show and cancelled in range | lib/analytics/report.ts, app/actions/analytics.ts | P1 | shipped |
| C5 | reservation-analytics.md RA-6 | tests/unit/analytics/duration.test.ts::mean visit duration uses seated event to completed_at | lib/analytics/report.ts, app/actions/analytics.ts | P1 | shipped |
| C6 | reservation-analytics.md RA-7 | tests/unit/analytics/patterns.test.ts::restaurant-level histograms by date weekday hour party_size | lib/analytics/report.ts, app/actions/analytics.ts | P1 | shipped |
| C7 | reservation-analytics.md RA-4 | tests/unit/analytics/actions.test.ts::one load returns outcomes duration and patterns for the same range | app/actions/analytics.ts, lib/analytics/report.ts | P1 | shipped |
| C8 | reservation-analytics.md RA-10 | tests/unit/analytics/staff-page.test.ts::analytics UI and JSON omit guest PII | app/actions/analytics.ts, app/admin/analytics/page.tsx | P0 | shipped |
| C9 | reservation-analytics.md RA-2 | tests/integration/analytics/read-only.integ.test.ts::analytics request does not modify reservations tables or status_events | app/actions/analytics.ts | P0 | shipped |
| C10 | reservation-analytics.md RA-9 | tests/integration/analytics/read-only.integ.test.ts::analytics does not grant guest SELECT on reservations or status_events | app/actions/analytics.ts (no GRANT) | P0 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-12 → 2026-09-12 · plan: analytics_tdd_wave_44867fc0
Criteria: 10 shipped · 0 manual-uat · 10 total
Phases delegated: 30 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 47 left on ledger (below floor) · 2 proposed (awaiting operator) — cap 3/run


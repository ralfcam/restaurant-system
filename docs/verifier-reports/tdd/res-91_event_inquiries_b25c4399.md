# TDD verifier report — event inquiries (`res-91_event_inquiries_b25c4399`)

FEATURE run. Linear: [RES-91](https://linear.app/realized/issue/RES-91).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — EI-1 Staff gate

Suggested review order:
- **Staff action gate** [auth] [security]
  - `app/actions/inquiries.ts:6-10` `getEventInquiries` — `requireStaffUser` then `createServiceClient`
  - `app/actions/inquiries.ts:13-18` `createInquiry` shell
  - `app/actions/inquiries.ts:20-25` `updateInquiryStatus` shell
- **Staff chrome / Service nav** [public-api]
  - `app/admin/inquiries/page.tsx:5` `dynamic = "force-dynamic"`
  - `app/admin/inquiries/page.tsx:7-19` `StaffShell` (English chrome)
  - `components/staff/staff-shell.tsx:43-48` NAV `href: "/admin/inquiries"`
  - `components/staff/staff-shell.tsx:87-94` Service `NAV_GROUPS` include-list

Reusable pattern: Staff-gated action-shell unit: hoisted `requireStaffUser` + `createServiceClient` mocks; unauth `{ error: "Unauthorized." }` and no client; staff/super_admin construct the client; source-scan page exists **plus** NAV href **and** Service `NAV_GROUPS` include-list (not NAV-only). Unused C1 stub params fail `eslint --max-warnings 0` — omit unused arity until a later criterion needs it.

### C2 — EI-2 Sibling table

Suggested review order:
- **Sibling table shape** [schema]
  - `supabase/migrations/00000000000000_baseline.sql:522-542` `CREATE TABLE IF NOT EXISTS event_inquiries` (after `servers` GRANT)
  - `…:530` `party_size INT NOT NULL CHECK (party_size >= 1)`
  - `…:531-534` `kind` / `status` CHECKs, default `'open'`
  - `…:537-541` trim-blank contact CHECK (`NULLIF(BTRIM(email|phone), '')`)
- **SIB-PRIV ACL** [security] [auth]
  - `…:544` `ENABLE ROW LEVEL SECURITY`
  - `…:547` `DROP POLICY IF EXISTS "Allow authenticated full access to event_inquiries"` (no matching `CREATE`)
  - `…:549-554` service_role `FOR ALL` `USING (true) WITH CHECK (true)`
  - `…:557-558` `REVOKE ALL` from `PUBLIC, anon, authenticated`; `GRANT ALL` to `service_role`
- **Reservations/analytics isolation**
  - `tests/unit/inquiries/schema.test.ts:45-46` `app/actions/analytics.ts` has no `event_inquiries`
- **Live CHECK probes**
  - `tests/integration/inquiries/event-inquiries.integ.test.ts:15-22` zero-arg `assertIsolatedHoursMutationTarget()` first in `beforeAll` / `afterEach`
  - `…:34-55` live `23514` on null contact, whitespace contact, `party_size = 0`

Reusable pattern: Fold a private sibling into baseline immediately after `GRANT ALL ON TABLE servers`: `CREATE TABLE IF NOT EXISTS` + SIB-PRIV clone of `servers` (DROP authenticated `FOR ALL` never CREATE; `REVOKE ALL` guest; `GRANT ALL` `service_role`; RLS + service-role `FOR ALL`); keep CHECKs inside `CREATE TABLE` so a paren-body source-scan can pin them; use `NULLIF(BTRIM(col), '')` for trim-blank contact (same `BTRIM` as `operating_windows`); add a fail-closed integ that probes live `23514`.

### C3 — EI-3 Privileges

Suggested review order:
- **SIB-PRIV ACL** [security] [auth]
  - `supabase/migrations/00000000000000_baseline.sql:544` `ENABLE ROW LEVEL SECURITY`
  - `…:547` `DROP POLICY IF EXISTS "Allow authenticated full access to event_inquiries"` (no matching `CREATE`)
  - `…:549-554` service_role `FOR ALL` `USING (true) WITH CHECK (true)`
  - `…:557-558` `REVOKE ALL` from `PUBLIC, anon, authenticated`; `GRANT ALL` to `service_role`
- **Matrix pin** [security]
  - `tests/integration/security/sibling-privileges.integ.test.ts:11-23` `IN_SCOPE_TABLES` includes `event_inquiries`
  - `…:25-34` `PRIVATE_TABLES` includes `event_inquiries`
  - `…:113-116` `guestTableCaps` falls through to `NONE_TABLE`
  - `…:350` `it("local reset exposes only the approved sibling role capability matrix")`

Reusable pattern: Pin a new private sibling on both `IN_SCOPE_TABLES` and `PRIVATE_TABLES` in the existing sibling matrix so the suite cannot vacuous-pass; do not fork a second privilege file. Characterization-green is honest when the prior criterion already shipped the SIB-PRIV clone.

### C4 — EI-4 Create

Suggested review order:
- **Staff mutation gate** [auth] [security]
  - `app/actions/inquiries.ts:17-21` `requireStaffUser` before any validate/insert
  - `app/actions/inquiries.ts:23-24` reject invalid input with no `createServiceClient`
- **Allowlisted insert / reservations isolation** [booking] [security]
  - `lib/inquiries/validation.ts` constructed row only (never spread client payload)
  - `app/actions/inquiries.ts` `.from("event_inquiries").insert(validated.row)`; omit `status` so DB default `open` applies
- **Contact + party rules**
  - `lib/inquiries/validation.ts` `EMAIL_RE` / `PHONE_RE` from reservations (BW-13)
  - `lib/inquiries/validation.ts` `party_size` integer `>= 1`, no 8-cover cap
  - `lib/inquiries/validation.ts` optional `kind` `group` | `private_event`

Reusable pattern: Staff mutation = `requireStaffUser` → pure `lib/` validator that returns an allowlisted insert row (never spread the client payload; never reuse a sibling validator that encodes a different invariant such as the 8-cover cap) → `createServiceClient` → `.from(private table).insert(row)`; share `PHONE_RE`/`EMAIL_RE` instead of forking contact regexes.

### C5 — EI-5 List

Suggested review order:
- **Staff list gate / fail-closed** [auth] [security]
  - `app/actions/inquiries.ts:33-34` `requireStaffUser` then `createServiceClient`
  - `app/actions/inquiries.ts:51-56` query error → `{ inquiries: [], error: "Could not load inquiries." }`
- **Default open+contacted filter** [public-api]
  - `app/actions/inquiries.ts:28` `DEFAULT_LIST_STATUSES`
  - `app/actions/inquiries.ts:39-45` declined/closed `.in([status])`; `"all"` skips `.in`; else open+contacted
  - `app/actions/inquiries.ts:47-49` `.order("requested_date").order("created_at")` (no date constraint)
- **Page wired to the reader (not chrome-only)** [public-api]
  - `app/admin/inquiries/page.tsx:7` `dynamic = "force-dynamic"`
  - `app/admin/inquiries/page.tsx:10-12` no-arg `getEventInquiries()`
  - `app/admin/inquiries/page.tsx:22` unwraps `listed.inquiries` and `listed.error`
- **Staff chrome**
  - `components/staff/inquiries-manager.tsx:10-16` error `role="alert"` before empty copy
  - `components/staff/inquiries-manager.tsx:18-23` empty copy for the default list
  - `components/staff/inquiries-manager.tsx:27-38` row list (`id` key)

Reusable pattern: STAFF-LIST reader = `requireStaffUser` → service client → default `.in("status", ["open","contacted"])` with `"all"` dropping the constraint; fail-closed `{ items: [], error }` and omit `error` on success; staff page must call the reader with no args and unwrap both the collection and `.error` (so chrome-only cannot pass).

### C6 — EI-6 Status update

Suggested review order:
- **Staff mutation gate** [auth] [security]
  - `app/actions/inquiries.ts:86-87` `requireStaffUser` before any client or write
  - `app/actions/inquiries.ts:89-91` invalid status → `Invalid inquiry status.`, no `createServiceClient`
- **Allowlisted status-only write** [public-api]
  - `app/actions/inquiries.ts:10` `INQUIRY_STATUSES` (CHECK-aligned `open|contacted|declined|closed`)
  - `app/actions/inquiries.ts:21` `EventInquiryRow.status` derived from that const
  - `app/actions/inquiries.ts:94-97` `.from("event_inquiries").update({ status }).eq("id", id)` — no other fields, no `reservations`
- **List defaults stay a subset**
  - `app/actions/inquiries.ts:30-33` `DEFAULT_LIST_STATUSES` `satisfies` the same allowlist

Reusable pattern: Staff status mutation = `requireStaffUser` → CHECK-aligned allowlist (stable error, no service client) → `.update({ status })` only (never spread the client payload; do not reuse reservation transition tables).

### C7 — EI-7 Isolation

Suggested review order:
- **Create isolation (no dual-write)** [booking] [security]
  - `app/actions/inquiries.ts:67-74` `requireStaffUser` then `.from("event_inquiries").insert(validated.row)` only
- **Reservations reader unchanged** [booking]
  - `app/actions/reservations.ts:216-220` `getReservationsByDate` `.from("reservations")` only
- **Occupancy still reservations-only** [booking]
  - `app/actions/reservations.ts:767-771` `getAvailableSlots` `.from("reservations")`
  - `supabase/migrations/00000000000000_baseline.sql:284-286` trigger `SUM(r.party_size) FROM reservations r`
- **Live pin**
  - `tests/integration/inquiries/event-inquiries.integ.test.ts:86-97` SHA-256 snapshot of `reservations`
  - `…:122-160` inquiry insert → checksum unchanged + `getReservationsByDate` omits probe + `getAvailableSlots` equality

Reusable pattern: Occupancy isolation integ = staff-mocked sibling create + before/after SHA-256 of `reservations` (catches dual-write) + date reader omit + `getAvailableSlots` equality; inject URL/anon/service from `npx supabase status -o env` (`vitest.integration.config.ts` does not load `.env.local`); do not invent occupancy SQL when create is already isolated.

### C8 — EI-8 No conversion

Suggested review order:
- **No convert/confirm action** [public-api]
  - `app/actions/inquiries.ts:64` `createInquiry` / `:82` `updateInquiryStatus` / `:35` `getEventInquiries` — only three async exports
  - `tests/unit/inquiries/no-convert.test.ts:45-48` `Object.keys` `/convert|confirm/i` empty
- **Closed is a status write, not a booking** [booking] [security]
  - `app/actions/inquiries.ts:86-97` staff gate → allowlist → `.from("event_inquiries").update({ status }).eq("id", id)` (no `reservations`)
  - `tests/unit/inquiries/no-convert.test.ts:53-56` `closed` → `from("event_inquiries")`, not `from("reservations")`
- **Live pin**
  - `tests/integration/inquiries/event-inquiries.integ.test.ts:193-224` close → reservations count + SHA-256 unchanged

Reusable pattern: Forbidden-path criterion stays characterization-green when status-only update already exists: pin empty convert/confirm exports + `closed` does not `from("reservations")`, and fail-closed integ that closes a live row then SHA-256s `reservations`; inject URL/anon/service from `npx supabase status -o env`; do not invent a convert action to make the test “more real.”

### C9 — EI-9 Mutating integ is local-only

Suggested review order:
- **EI-9 AST pin** [security]
  - `tests/unit/inquiries/inquiry-integ-isolation.test.ts:7` glob `tests/integration/inquiries/*.integ.test.ts`
  - `…:8-9` helper module + `assertIsolatedHoursMutationTarget`
  - `…:87-88` `it("inquiries integ suites call assertIsolatedHoursMutationTarget before mutating writes")`
  - `…:96-116` named import + zero-arg first statement on `beforeAll` / `afterEach` / `afterAll`
  - `…:119-129` synthetic explicit-URL call rejected
- **Live integ the pin scans** [security]
  - `tests/integration/inquiries/event-inquiries.integ.test.ts:17` helper import
  - `…:37-43` CHECK describe: zero-arg helper first in `beforeAll` / `afterEach`
  - `…:110-123` occupancy describe: same pin before cleanup writes
  - `…:178-191` no-convert describe: same pin before cleanup writes
- **Shared isolation helper (do not rename this run)**
  - `lib/scheduling/hours-mutation-target.ts:28-33` zero-arg assert against local hosts

Reusable pattern: Copy the RES-ISO AST pin per area (nonempty glob, named import, zero-arg first statement on write hooks, synthetic explicit-URL rejection) rather than extracting a shared scanner on the fourth copy.

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from the last Refactor close-out of each criterion.

- **[security] [schema]** `event_inquiries` SIB-PRIV ACL — `supabase/migrations/00000000000000_baseline.sql:522-558` (`CREATE TABLE` after `servers` GRANT; ENABLE RLS; DROP authenticated `FOR ALL` never CREATE; service_role `FOR ALL`; `REVOKE ALL` guest; `GRANT ALL` `service_role`); matrix pin `tests/integration/security/sibling-privileges.integ.test.ts` `IN_SCOPE_TABLES` + `PRIVATE_TABLES`
- **[auth] [security]** Staff gate before every inquiries I/O — `app/actions/inquiries.ts:38-41` list (`requireStaffUser` then `createServiceClient`); `:67-73` create (validate, then client); `:86-93` status (invalid status returns before client)
- **[booking] [security]** No dual-write / no conversion — `app/actions/inquiries.ts:73-74` `.from("event_inquiries").insert(validated.row)` only; `:94-97` `.update({ status })` only; no convert/confirm export; live SHA-256 of `reservations` in `tests/integration/inquiries/event-inquiries.integ.test.ts`
- **[booking]** Occupancy stays on `reservations` — `getReservationsByDate` / `getAvailableSlots` still `.from("reservations")`; trigger `SUM(r.party_size) FROM reservations r` (`baseline.sql:284-286`)
- **[public-api]** STAFF-LIST fail-closed + default open+contacted — `app/actions/inquiries.ts:35-61`; page `app/admin/inquiries/page.tsx:10-22` no-arg `getEventInquiries()` unwraps `.inquiries` and `.error`
- **[public-api]** Create allowlist — `lib/inquiries/validation.ts` constructed row (never spread client payload); `PHONE_RE`/`EMAIL_RE` reuse; party_size ≥ 1, no 8-cover cap
- **[public-api]** Status allowlist — `app/actions/inquiries.ts:10` `INQUIRY_STATUSES`; invalid → `Invalid inquiry status.`
- Staff chrome — `app/admin/inquiries/page.tsx` (`StaffShell`, `force-dynamic`); `components/staff/staff-shell.tsx` `href: "/admin/inquiries"` in Service `NAV_GROUPS`; `components/staff/inquiries-manager.tsx` list
- **[security]** EI-9 local integ pin — `tests/unit/inquiries/inquiry-integ-isolation.test.ts` glob `tests/integration/inquiries/*.integ.test.ts`; zero-arg `assertIsolatedHoursMutationTarget()` first in write hooks

## Traceability (final)

Run: 2026-09-13 · plan: res-91_event_inquiries_b25c4399 · issue: RES-91

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | event-inquiries.md EI-1 | tests/unit/inquiries/staff-gate.test.ts::staff inquiries is gated and linked from Service nav | app/admin/inquiries/page.tsx, app/actions/inquiries.ts, components/staff/staff-shell.tsx | P0 | shipped |
| C2 | event-inquiries.md EI-2 | tests/unit/inquiries/schema.test.ts::baseline defines event_inquiries CHECKs + tests/integration/inquiries/event-inquiries.integ.test.ts::rejects blank contact and party_size below 1 | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C3 | event-inquiries.md EI-3 | tests/integration/security/sibling-privileges.integ.test.ts::local reset exposes only the approved sibling role capability matrix | supabase/migrations/00000000000000_baseline.sql (C2 SIB-PRIV) | P0 | shipped |
| C4 | event-inquiries.md EI-4 | tests/unit/inquiries/create.test.ts::staff createInquiry persists open inquiry and rejects invalid contact | app/actions/inquiries.ts, lib/inquiries/validation.ts, lib/reservations/validation.ts | P1 | shipped |
| C5 | event-inquiries.md EI-5 | tests/unit/inquiries/list.test.ts::list defaults to open+contacted and fail-closes | app/actions/inquiries.ts, app/admin/inquiries/page.tsx, components/staff/inquiries-manager.tsx | P1 | shipped |
| C6 | event-inquiries.md EI-6 | tests/unit/inquiries/update-status.test.ts::staff may set any of four statuses and cannot edit other fields | app/actions/inquiries.ts | P1 | shipped |
| C7 | event-inquiries.md EI-7 | tests/integration/inquiries/event-inquiries.integ.test.ts::inquiry rows do not occupy covers or appear on reservations | app/actions/inquiries.ts (createInquiry isolation) | P0 | shipped |
| C8 | event-inquiries.md EI-8 | tests/unit/inquiries/no-convert.test.ts::inquiries actions have no convert or confirm export and closing does not touch reservations + tests/integration/inquiries/event-inquiries.integ.test.ts::closing an inquiry does not insert reservations | app/actions/inquiries.ts (no convert path) | P1 | shipped |
| C9 | event-inquiries.md EI-9 | tests/unit/inquiries/inquiry-integ-isolation.test.ts::inquiries integ suites call assertIsolatedHoursMutationTarget before mutating writes | tests/integration/inquiries/event-inquiries.integ.test.ts (C2 pin) | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-13 → 2026-09-13 · plan: res-91_event_inquiries_b25c4399
Criteria: 9 shipped · 0 manual-uat · 9 total
Phases delegated: 27 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 1 filed (RES-102) · 0 attached · 40 left on ledger (below floor) — cap 3/run

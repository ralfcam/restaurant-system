# TDD log — res-104_guest_profiles_f8c2e1a0

### GP-2

Suggested review order:
- identity-key contract [public-api] — `lib/guest-profiles.ts:1`
- blank collapse — `lib/guest-profiles.ts:2`
- pin (unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:5`

Reusable pattern: Persist-or-normalize: if identity is trim+lowercase, either writers store the normalized form or every reader goes through `normalizeGuestEmail` — a later exact-match `.eq("email", key)` will split fichas

### GP-3

Suggested review order:
- isolation filter [security] — `lib/guest-profiles.ts:11`
- public builder contract [public-api] — `lib/guest-profiles.ts:5`
- identity reuse — `lib/guest-profiles.ts:9` then `lib/guest-profiles.ts:1`
- pin (assertions unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:14`

Reusable pattern: Isolation pins should send mixed-case A/B through the same normalizer as production — an already-normalized fixture lets `row.email === email` pass GP-3

### GP-11

Suggested review order:
- authz gate [auth] — `app/actions/guest-profiles.ts:7`
- authz gate [auth] — `app/actions/guest-profiles.ts:19`
- service-role after staff [security] — `app/actions/guest-profiles.ts:11`
- service-role after staff [security] — `app/actions/guest-profiles.ts:23`
- public action contract [public-api] — `app/actions/guest-profiles.ts:6`
- public action contract [public-api] — `app/actions/guest-profiles.ts:14`
- pin (assertions unchanged) — `tests/unit/guest-profiles/res-priv.test.ts:80`

Reusable pattern: Privilege stub keeps the public arg list and `void`s unused inputs/`createServiceClient()` so `--max-warnings 0` does not force a premature query body; null-staff is what pins “no service client”

### GP-1

Suggested review order:
- authz gate [auth] — `app/actions/guest-profiles.ts:9`
- service-role after staff [security] — `app/actions/guest-profiles.ts:13`
- staff route chrome [public-api] — `app/admin/customers/[email]/page.tsx:13`
- parallel staff read — `app/admin/customers/[email]/page.tsx:14`
- pin (unchanged) — `tests/unit/guest-profiles/staff-gate.test.ts:62`

Reusable pattern: Staff-route Green copies inquiries: `force-dynamic` + `StaffShell` + `Promise.all([gatedReader, getAuthUser])`; the reader stays a staff-then-`void createServiceClient()` / `return {}` stub until the live-read criterion

### GP-10

Suggested review order:
- authz guard [auth] — `app/actions/guest-profiles.ts:23`
- service-role after staff [security] — `app/actions/guest-profiles.ts:26`
- PII patch excludes email [public-api] — `app/actions/guest-profiles.ts:28`
- email-group filter [booking] — `app/actions/guest-profiles.ts:29`
- pin (assertions unchanged) — `tests/unit/guest-profiles/update-pii.test.ts:51`

Reusable pattern: Staff PII write-through: `requireStaffUser` first, then service-role `.update({ guest_name, phone })` with `.eq("email", normalizeGuestEmail(...))` — identity stays in the filter, never the patch; pin unauthorized before any `from()`/`update()`

### GP-6

Suggested review order:
- visit invariant [booking] — `lib/guest-profiles.ts:15`
- isolation-then-map [public-api] — `lib/guest-profiles.ts:11-16`
- builder contract — `lib/guest-profiles.ts:5-8`
- pin (assertions unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:24`

Reusable pattern: GP-6 visit is closed `status === "completed"` after the email filter — do not reuse analytics’ `completed && completed_at` predicate, and do not fold sort/PII/column mapping into this line

### GP-7

Suggested review order:
- newest-first invariant [booking] — `lib/guest-profiles.ts:32-34`
- isolation → decorate → sort [public-api] — `lib/guest-profiles.ts:24-34`
- date/time defaulting — `lib/guest-profiles.ts:28-29`
- pin (assertions unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:53`

Reusable pattern: Map-then-sort so newest-first `localeCompare` uses the same defaulted `date`/`time` the history rows expose; keep the comparator inline until a second caller exists; lex order is correct only for ISO `YYYY-MM-DD` + zero-padded `HH:MM`

### GP-4

Suggested review order:
- displayed-PII pick [public-api] — `lib/guest-profiles.ts:44`
- identity email vs row email [booking] — `lib/guest-profiles.ts:47` then `lib/guest-profiles.ts:32`
- isolation-before-pick [security] — `lib/guest-profiles.ts:34`
- newest-first sort reused by the pick [booking] — `lib/guest-profiles.ts:41`
- pin (assertions unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:75`

Reusable pattern: After newest-first sort, displayed PII is `history[0]` (optional-chained); ficha `email` is the normalized identity key, never `newest.email` (which may still be mixed-case/padded).

### GP-5

Suggested review order:
- history column contract [public-api] — `lib/guest-profiles.ts:37`
- history column contract [public-api] — `lib/guest-profiles.ts:39`
- history column contract [public-api] — `lib/guest-profiles.ts:40`
- history column contract [public-api] — `lib/guest-profiles.ts:41`
- history column contract [public-api] — `lib/guest-profiles.ts:42`
- non-exclusive row shape [booking] — `lib/guest-profiles.ts:38`
- visit flag preserved — `lib/guest-profiles.ts:43`
- output type requires the four fields [public-api] — `lib/guest-profiles.ts:22`
- newest-row PII unchanged — `lib/guest-profiles.ts:48`
- pin (assertions unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:118`

Reusable pattern: For “at least these columns” history, keep `...row` plus an explicit copy of the named fields; an exclusive `{date,time,party_size,status}` object breaks isolation pins that read `row.email`, and `as number`/`as string` is a type lie — not a runtime default.

### GP-8

Suggested review order:
- authz guard [auth] — `app/actions/guest-profiles.ts:10`
- live service-role select [security] — `app/actions/guest-profiles.ts:13`
- identity filter (exact `.eq`, not `lower()`) [booking] — `app/actions/guest-profiles.ts:16`
- builder composition [public-api] — `app/actions/guest-profiles.ts:19`
- query-error path — `app/actions/guest-profiles.ts:17`
- pin (assertions unchanged) — `tests/unit/guest-profiles/live-read.test.ts:90`

Reusable pattern: Staff live ficha read is `requireStaffUser` then a **fresh** `createServiceClient().from("reservations").select("*").eq("email", normalizeGuestEmail(email))` into `buildGuestProfile` — pin `from()` call count per read; do not wrap the reader in `cache()` / `'use cache'` if GP-8 is “next read includes the new row”

### GP-12

Suggested review order:
- empty-key isolation [security] — `lib/guest-profiles.ts:36`
- same return shape, empty `history` [public-api] — `lib/guest-profiles.ts:49`
- identity stays the requested key, not a leaked row [public-api] — `lib/guest-profiles.ts:51`
- newest PII optional-chain does not pick foreign rows — `lib/guest-profiles.ts:48`
- live reader composes the builder [security] — `app/actions/guest-profiles.ts:19`
- pin (assertions unchanged) — `tests/unit/guest-profiles/build-profile.test.ts:169`

Reusable pattern: Empty-key is isolation with an unknown key — keep the same filter+return; do not add `found`/`notFound` discriminators or an exclusive empty shape; leave empty chrome to a later page criterion.

### GP-9

Suggested review order:
- href contract [public-api] — `lib/guest-profiles.ts:5`
- identity reuse — `lib/guest-profiles.ts:6` then `lib/guest-profiles.ts:1`
- staff list email field [booking] — `app/actions/reservations.ts:63`
- UI row mapper [booking] — `components/staff/reservations-manager.tsx:45` then `:60`
- per-row ficha control [public-api] — `components/staff/reservations-manager.tsx:346` then `:360`

Reusable pattern: Staff reservation-row ficha entry is `guestProfileHref` (normalize + `encodeURIComponent`) plus a per-row `Link` when href is non-null — map `email` onto the UI row; do not add a customer-list nav item.

## Suggested Review Order (collated)

Highest-risk first.

- [auth] Staff-before-service-role — `app/actions/guest-profiles.ts:10`, `app/actions/guest-profiles.ts:23`
- [security] Live `select("*")` after staff — `app/actions/guest-profiles.ts:13`
- [security] Isolation filter then empty-key — `lib/guest-profiles.ts:36`
- [security] Extra columns via `...row` — `lib/guest-profiles.ts:37`
- [booking] Exact `.eq("email", normalizeGuestEmail(...))` on read and write — `app/actions/guest-profiles.ts:16`, `app/actions/guest-profiles.ts:33`
- [booking] Newest-first sort + displayed-PII pick — `lib/guest-profiles.ts:45`, `lib/guest-profiles.ts:48`
- [booking] Visit is `status === "completed"` — `lib/guest-profiles.ts:43`
- [public-api] Identity + href — `lib/guest-profiles.ts:1`, `lib/guest-profiles.ts:5`
- [public-api] Staff list email + ficha `Link` — `app/actions/reservations.ts:63`, `components/staff/reservations-manager.tsx:346`
- [public-api] Staff route chrome (payload unused) — `app/admin/customers/[email]/page.tsx:13`

## Traceability (final)

Run: 2026-09-16 · plan: res-104_guest_profiles_f8c2e1a0 · issue: RES-104

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| GP-2 | guest-profiles.md GP-2 | build-profile.test.ts::normalizeGuestEmail matches trim+lowercase and drops blank emails | lib/guest-profiles.ts | P0 | shipped |
| GP-3 | guest-profiles.md GP-3 | build-profile.test.ts::buildGuestProfile excludes other emails | lib/guest-profiles.ts | P0 | shipped |
| GP-11 | guest-profiles.md GP-11 | res-priv.test.ts::guest profile reader and mutator use service client and do not grant anon SELECT | app/actions/guest-profiles.ts | P0 | shipped |
| GP-1 | guest-profiles.md GP-1 | staff-gate.test.ts::staff guest profile is gated at /admin/customers | app/admin/customers/[email]/page.tsx, app/actions/guest-profiles.ts | P0 | shipped |
| GP-10 | guest-profiles.md GP-10 | update-pii.test.ts::updateGuestProfilePii writes name and phone on the email group and never email | app/actions/guest-profiles.ts | P0 | shipped |
| GP-6 | guest-profiles.md GP-6 | build-profile.test.ts::completed reservations are visits and others are not | lib/guest-profiles.ts | P1 | shipped |
| GP-7 | guest-profiles.md GP-7 | build-profile.test.ts::history is newest date then time first | lib/guest-profiles.ts | P1 | shipped |
| GP-4 | guest-profiles.md GP-4 | build-profile.test.ts::displayed PII comes from the newest reservation | lib/guest-profiles.ts | P1 | shipped |
| GP-5 | guest-profiles.md GP-5 | build-profile.test.ts::each history row has date time party_size status | lib/guest-profiles.ts | P1 | shipped |
| GP-8 | guest-profiles.md GP-8 | live-read.test.ts::getGuestProfile is a live service-role select | app/actions/guest-profiles.ts | P1 | shipped |
| GP-12 | guest-profiles.md GP-12 | build-profile.test.ts::empty matching set is empty not other guests | lib/guest-profiles.ts | P1 | shipped |
| GP-9 | guest-profiles.md GP-9 | reservation-entry.test.ts::reservations list links a non-blank email to the ficha | lib/guest-profiles.ts, app/actions/reservations.ts, components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-15 → 2026-09-16 · plan: res-104_guest_profiles_f8c2e1a0
Criteria: 12 shipped · 0 manual-uat · 12 total
Phases delegated: 36
Back-loops: GP-5: 1 extra cycle (Red already green via `...row`; operator accepted pin, then Green/Refactor)
BLOCKED events: 1 — GP-5 Red already green; operator accepted the pin
Issues: 0 filed · 2 attached-to-existing · 47 left on ledger (4 proposed, operator-unconfirmed + 43 below floor) — cap 3/run

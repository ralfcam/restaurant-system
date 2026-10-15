# TDD verifier report — res-167-168_seated_visit_orders_3ce2

FEATURE run. Linear: RES-167 (New seated guest can inherit the previous guest's bill) and RES-168 (POS allows orders to a table with no seated guest), one PR. Owning specs: `docs/specs/scheduling.md` (FP-8, FP-13, FP-15, FP-15-COMPLETE, FP-15-UNAVAILABLE) and `docs/specs/walk-in-seating.md` (WI-2, WI-9, WI-10).

This file is a **reading guide for `/commit`**, not a verdict. Order of criteria is C1 … C14 (see the work-order `.cursor/plans/res-167-168_seated_visit_orders_3ce2.plan.md`).

## Criterion close-outs (incremental)

### C1 — orders.reservation_id FK + NOT VALID CHECK

Suggested review order:

- Visit link and not-null check (FP-13): `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql:5` [schema], `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql:7`, `supabase/migrations/00000000000000_baseline.sql:931`
- Orders stay service-role-only: `supabase/migrations/00000000000000_baseline.sql:954` [auth], `tests/integration/pos/orders-persistence.integ.test.ts:206`
- Guest insert allowlist untouched: `supabase/migrations/00000000000000_baseline.sql:186` [auth]

Reusable pattern: none.

Measured (not fixed): a `NOT VALID` CHECK is still evaluated on UPDATE of a legacy row. With a NULL-`reservation_id` order, `UPDATE orders SET status = 'preparing'` fails with SQLSTATE `23514`; the row is unchanged. A pre-release open kitchen order cannot change status after the migration.

### C2 — reservations.source (CHECK, default online, not guest-insertable)

Suggested review order:

- Named check, ALTER after the table (WI-9): `supabase/migrations/00000000000000_baseline.sql:160` [schema], `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql:10`
- Guest insert allowlist still omits `source`: `supabase/migrations/00000000000000_baseline.sql:193` [auth]
- Test pins default, CHECK, and guest denial: `tests/integration/reservations/reservation-source.integ.test.ts:73`

Reusable pattern: Declare a baseline column that also ships in a dated migration only via the post-table `ALTER` (`ADD COLUMN IF NOT EXISTS` plus `DROP CONSTRAINT IF EXISTS` / named `ADD CONSTRAINT`), so `db reset` and an already-baselined database share one constraint name.

### C3 — refuse a table with no seated reservation

Suggested review order:

- Staff-gated refusal before any write (FP-13): `app/actions/operations.ts:1058` [auth], `app/actions/operations.ts:1093` [security], `app/actions/operations.ts:1099`
- Client union guard (specific toast is C14): `components/staff/pos-terminal.tsx:86` [public-api]

Reusable pattern: A new awaited `from()` in `createKitchenOrder` consumes one slot in the `message-keys` thenable script queue, and the seated lookup is `.select().eq().in()`, not `.maybeSingle()`.

Note: the Green change turned `tests/unit/floor/message-keys.test.ts` ("POS kitchen-order errors are errors.\* catalog keys") red because its scripted query queue was one read short. A `tdd-red` fixture follow-up added one seated-reservation row to that queue (no assertion weakened) before Refactor.

### C4 — refuse a table held by two or more seated reservations

Suggested review order:

- Visit refusals before any write (FP-13): `app/actions/operations.ts:1099`, `app/actions/operations.ts:1100`, `app/actions/operations.ts:1101` [public-api]
- Staff gate before the read: `app/actions/operations.ts:1058` [security], `app/actions/operations.ts:1093`
- Exactly one seated row still inserts (stamping is C5): `app/actions/operations.ts:1102`

Reusable pattern: null-safe `const seatedCount = seated?.length ?? 0`, then return the typed refusal for `0` and for `>1` before any insert, so a later stamp can use the single remaining row.

### C5 — stamp the seated reservation against real Postgres

Suggested review order:

- Staff gate and server-side visit id (FP-13): `app/actions/operations.ts:1053` [auth], `app/actions/operations.ts:1058` [security]
- One seated visit, or a typed refusal: `app/actions/operations.ts:1093` [booking], `app/actions/operations.ts:1099`, `app/actions/operations.ts:1102`
- Stamp that id on the order: `app/actions/operations.ts:1109` [booking]
- Real-Postgres test (stamp, items saved, hand-set seated table refused, zero writes): `tests/integration/pos/orders-persistence.integ.test.ts`

Reusable pattern: none.

### C6 — merged member table stamps the primary's seated visit

Suggested review order:

- Authz before any lookup or write (FP-13): `app/actions/operations.ts:1059` [auth]
- Merge membership and member labels (FP-8): `app/actions/operations.ts:1094`, `app/actions/operations.ts:1096`
- Seated lookup and the none / two-or-more refusals: `app/actions/operations.ts:1111`, `app/actions/operations.ts:1117`
- Server-side visit id on the insert, not a caller field: `app/actions/operations.ts:1127` [security]
- Member-table success assertion: `tests/unit/floor/pos-table-picker.test.ts:337`

Reusable pattern: when a shared merge loader returns member ids only, one follow-up `select id, label` is the extra read; do not widen that loader for a single caller.

Note: as in C3, the Green change shifted the scripted query queue in `tests/unit/floor/message-keys.test.ts`; a `tdd-red` fixture follow-up added the no-merge membership read to both kitchen-order scripts (no assertion weakened).

### C7 — bill sums by reservation id

Suggested review order:

- Per-visit sum contract (FP-15): `lib/floor/table-bills.ts:13` [booking], `lib/floor/table-bills.ts:18`, `lib/floor/table-bills.ts:19`
- Temporary label-as-id map at the snapshot call site (removed by C8): `app/actions/reservations.ts:881` [booking]
- Staff gate still returns before the sum: `app/actions/reservations.ts:828` [auth]

Reusable pattern: none.

### C8 — getFloorSnapshot keys totals by reservation id

Suggested review order:

- Totals map is keyed by reservation id (FP-15): `app/actions/reservations.ts:753`
- Orders select columns, id-ordered paging (FP-15-COMPLETE): `app/actions/reservations.ts:856` [booking]
- `Number(total)` then sum by `reservation_id`: `app/actions/reservations.ts:881` [booking]
- Staff gate before the service-role scan: `app/actions/reservations.ts:828` [auth]
- Unavailable stays null, not `{}` (FP-15-UNAVAILABLE): `app/actions/reservations.ts:873`

Reusable pattern: none.

Note: `tests/unit/floor/schema.test.ts` (source pin on the orders select) was updated in the C8 Red phase for the same contract change.

### C9 — overlay chip bills by the seated reservation id

Suggested review order:

- Seated visit bill uses the reservation id; missing key is 0; confirmed stays null (FP-15): `lib/reservations/auto-assign.ts:353` [booking]
- Contract comment for omitted/null totals and the shared merge bill (FP-8): `lib/reservations/auto-assign.ts:307`
- Chip treats numeric 0 as a visible total: `components/staff/floor-plan.tsx:1340`

Reusable pattern: none.

### C10 — seatWalkIn stamps source walk_in

Suggested review order:

- Authz before the walk-in write (WI-1): `app/actions/reservations.ts:261` [auth]
- Server-stamped `source` on the reservations insert (WI-2, WI-9): `app/actions/reservations.ts:338` [security]
- Payload assertion: `tests/unit/reservations/walk-in.test.ts:301`

Reusable pattern: none.

### C11 — seatWalkIn returns the new reservation id

Suggested review order:

- Success contract, a created walk-in returns its id (WI-2): `app/actions/reservations.ts:260` [public-api], `app/actions/reservations.ts:336`, `app/actions/reservations.ts:362` [public-api]
- Error paths still return `{ error }` and no id: `app/actions/reservations.ts:353`

Reusable pattern: none.

Note: `tests/unit/guest-profiles/incidents.test.ts` had its `seatWalkIn` insert stub updated in the C11 Red phase so `.select("id").single()` resolves a row id (assertions unchanged).

### C12 — no review email without an address

Suggested review order:

- Staff gate, then the select list includes `email` (WI-10, PV-4): `app/actions/reservations.ts:539` [auth], `app/actions/reservations.ts:545` [security]
- Status update still commits before the enqueue: `app/actions/reservations.ts:567` [booking]
- Trim gate, then the `review_email_sends` insert: `app/actions/reservations.ts:578`
- Mock honors the select list, so a source that drops `email` from the select fails: `tests/unit/marketing/review-email-queue.test.ts`

Reusable pattern: A Supabase mock whose `select()` ignores its column argument does not prove a new column is requested; project the row to the selected columns (`projectSelectedColumns`) so dropping a column fails the test.

Note: a test-hardening `tdd-red` follow-up made the queue mock honor the select list. While proving it, that subagent ran `git checkout -- app/actions/reservations.ts`, which discarded the uncommitted C8, C10, C11 and C12 source in that one file. A `tdd-green` restore re-applied exactly those changes (diff reviewed against the earlier Green and Refactor reports; full unit suite 703 passed, typecheck clean). No other file was affected.

### C13 — POS refusal copy exists in EN and FR

Suggested review order:

- Title and description under `staff.pos` (FP-13): `messages/en.json:230` [public-api], `messages/fr.json:230` [public-api], `messages/en.json:231`, `messages/fr.json:231`
- Typed error keys under `errors.pos`: `messages/en.json:650`, `messages/fr.json:650`, `messages/en.json:651`, `messages/fr.json:651`
- Copy and `{label}` pin: `tests/unit/floor/message-keys.test.ts`

Reusable pattern: none.

### C14 — PosTerminal not-seated toast

Suggested review order:

- Refusal toast vs generic failure (FP-13): `components/staff/pos-terminal.tsx:86` [public-api]
- Keep the order on the refusal: `components/staff/pos-terminal.tsx:87` [booking]
- Other returned errors keep the generic toast: `components/staff/pos-terminal.tsx:93`
- Success path still clears the cart, `finally` re-enables Send: `components/staff/pos-terminal.tsx:96`, `components/staff/pos-terminal.tsx:110`
- Contract the test pins: `tests/unit/floor/pos-terminal-not-seated.test.ts:141`

Reusable pattern: none.

## Suggested Review Order (collated)

Highest-risk first.

1. **Migration and baseline [schema]** — `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql` adds `orders.reservation_id` (FK, default NO ACTION) with the `NOT VALID` CHECK `orders_reservation_id_required`, and `reservations.source` with `reservations_source_check`; the same statements sit in `supabase/migrations/00000000000000_baseline.sql`. The guest INSERT grant (`:193`) is unchanged, so a guest cannot set `source`. Sensitive: Jose accepts before merge.
2. **Server-side visit resolution and refusal [auth] [security]** — `app/actions/operations.ts` `createKitchenOrder` (`:1059` staff gate, `:1094`-`:1127` merge labels, seated lookup, typed refusals, `reservation_id` stamp from the single seated row, never from the caller); `tests/integration/pos/orders-persistence.integ.test.ts` (real Postgres) and `tests/unit/floor/pos-table-picker.test.ts`.
3. **Floor bill keyed by visit [booking]** — `lib/floor/table-bills.ts` `sumOpenOrderTotalsByReservationId`, `app/actions/reservations.ts` `getFloorSnapshot` (`reservation_id, total, status`, id-ordered paging, `null` on error), `lib/reservations/auto-assign.ts:353` `tableTotals[reservation.id] ?? 0`.
4. **Walk-in source and id [public-api]** — `app/actions/reservations.ts` `seatWalkIn` stamps `source: "walk_in"` and returns `{ id }`.
5. **Review email only with an address [booking]** — `app/actions/reservations.ts` `transitionReservationStatus` selects `email` and enqueues only for a non-blank address; `tests/unit/marketing/review-email-queue.test.ts` honors the select list.
6. **POS refusal toast and copy [public-api]** — `components/staff/pos-terminal.tsx:86`, `messages/en.json`, `messages/fr.json`; `tests/unit/floor/pos-terminal-not-seated.test.ts`, `tests/unit/floor/message-keys.test.ts`.
7. **Specs** — `docs/specs/scheduling.md` FP-13, FP-15, FP-15-COMPLETE; `docs/specs/walk-in-seating.md` WI-2, WI-9, WI-10.

## Traceability (final)

Run: 2026-10-15 · plan: res-167-168_seated_visit_orders_3ce2 · issues: RES-167, RES-168

| Criterion | Spec ref                       | Test file::name                                                                                                                                       | Source file(s)                                                                                                                         | Risk | Status  |
| --------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| C1        | FP-13, menu AC-5               | `tests/integration/pos/orders-persistence.integ.test.ts`::orders require a visit: reservation_id FK + CHECK, and a past visit's orders survive a new visit | `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql`, `supabase/migrations/00000000000000_baseline.sql`   | P0   | shipped |
| C2        | WI-9                           | `tests/integration/reservations/reservation-source.integ.test.ts`::reservations.source: CHECK, default online, guest cannot set it                    | `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql`, `supabase/migrations/00000000000000_baseline.sql`   | P0   | shipped |
| C3        | FP-13                          | `tests/unit/floor/pos-table-picker.test.ts`::createKitchenOrder refuses a table with no seated reservation and writes nothing                         | `app/actions/operations.ts`                                                                                                            | P0   | shipped |
| C4        | FP-13                          | `tests/unit/floor/pos-table-picker.test.ts`::createKitchenOrder refuses a table held by two seated reservations                                       | `app/actions/operations.ts`                                                                                                            | P0   | shipped |
| C5        | FP-13, menu AC-5               | `tests/integration/pos/orders-persistence.integ.test.ts`::createKitchenOrder stamps the seated reservation and refuses a hand-set seated table against real Postgres | `app/actions/operations.ts`                                                                                          | P0   | shipped |
| C6        | FP-13, FP-8                    | `tests/unit/floor/pos-table-picker.test.ts`::createKitchenOrder on a merged member table stamps the primary's seated reservation                      | `app/actions/operations.ts`                                                                                                            | P1   | shipped |
| C7        | FP-15                          | `tests/unit/floor/table-bills.test.ts`::per-visit bill: sumOpenOrderTotalsByReservationId counts only the visit's non-cancelled orders                | `lib/floor/table-bills.ts`                                                                                                             | P0   | shipped |
| C8        | FP-15, FP-15-COMPLETE, FP-15-UNAVAILABLE | `tests/unit/floor/floor-snapshot-bills.test.ts`::getFloorSnapshot keys seated bill totals by reservation id and keeps paging and unavailable semantics | `app/actions/reservations.ts`                                                                           | P0   | shipped |
| C9        | FP-15                          | `tests/unit/reservations/auto-assign.test.ts`::overlay seated chip takes its bill from the seated reservation id, not the table label                 | `lib/reservations/auto-assign.ts`                                                                                                      | P0   | shipped |
| C10       | WI-2, WI-9                     | `tests/unit/reservations/walk-in.test.ts`::seatWalkIn stamps source walk_in on the inserted row                                                       | `app/actions/reservations.ts`                                                                                                          | P1   | shipped |
| C11       | WI-2                           | `tests/unit/reservations/walk-in.test.ts`::seatWalkIn returns the id of the created reservation                                                       | `app/actions/reservations.ts`                                                                                                          | P1   | shipped |
| C12       | WI-10, PV-4                    | `tests/unit/marketing/review-email-queue.test.ts`::transitionReservationStatus queues no review email for a reservation without an email             | `app/actions/reservations.ts`                                                                                                          | P1   | shipped |
| C13       | FP-13                          | `tests/unit/floor/message-keys.test.ts`::POS not-seated refusal copy exists in en and fr with the label placeholder                                   | `messages/en.json`, `messages/fr.json`                                                                                                 | P2   | shipped |
| C14       | FP-13                          | `tests/unit/floor/pos-terminal-not-seated.test.ts`::PosTerminal maps a not-seated refusal to the specific toast and keeps the order                   | `components/staff/pos-terminal.tsx`                                                                                                    | P1   | shipped |

**manual-UAT (deferred):** QA UAT on the PR preview with labelled test data: seat visit A and order, complete it, seat visit B on the same table and the chip starts at `CHF 0.00`; a walk-in can order; a hand-set seated table with no reservation is refused with the specific toast; a merged member table is accepted while the primary is seated; visual captures at 375px and 1280px plus one FR shot. The migration is applied to the shared preview/dev project only by `staging-migrations.yml` on merge to `staging`.

## Run metrics

Run: 2026-10-15 → 2026-10-15 · plan: res-167-168_seated_visit_orders_3ce2
Criteria: 14 shipped · 0 manual-uat · 14 total
Phases delegated: 46 Task calls (17 red, 15 green, 14 refactor). The 14 base red, 14 green and 14 refactor calls, plus three `tdd-red` fixture follow-ups (C3, C6, C12 hardening) and one `tdd-green` restore.
Back-loops: 4 (C3 and C6 scripted-queue fixtures, C12 select-list hardening, and a `tdd-green` restore of `app/actions/reservations.ts` after a subagent's `git checkout` discarded uncommitted work in that file)
BLOCKED events: none (the `tdd-red` hardening step reported BLOCKED after the accidental revert; resolved by the restore)
Issues: RES-167, RES-168
Final verification (C14 Refactor, then re-run by the orchestrator at commit time): unit 186 files, 705 passed; integration fail-closed 18 files, 33 of 34 passed, 0 skipped. The one failure is `tests/integration/scheduling/replace-operating-windows.integ.test.ts` (OH-PRIV): the local GoTrue returns `Email logins are disabled` for password sign-in, a local-stack auth setting unrelated to this change (file and `supabase/config.toml` are not in the diff).

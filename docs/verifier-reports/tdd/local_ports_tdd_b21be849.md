# TDD log — local_ports_tdd_b21be849

### LSP-1

Suggested review order:
- **Enabled listen ports (committed block)** `[public-api]`
  - `supabase/config.toml:10` — `[api] port = 45321`
  - `supabase/config.toml:35` — `[db] port = 45322`
  - `supabase/config.toml:97` — `[studio] port = 45323`
  - `supabase/config.toml:108` — `[local_smtp] port = 45324`
  - `supabase/config.toml:394` — `[analytics] port = 45327`
- **Unchanged isolation anchors (spot-check only)**
  - `supabase/config.toml:37` — `shadow_port = 54320`
  - `supabase/config.toml:44-47` — `[db.pooler]` disabled / `54329`
- **Regression guard (read-only; do not change assertions)**
  - `tests/unit/dev-toolchain/local-supabase-ports.test.ts:29-48` — exact-table `port` parse (excludes `[db.pooler]`)
  - `tests/unit/dev-toolchain/local-supabase-ports.test.ts:51-71` — all five keys + `< 49152`

Reusable pattern: exact TOML table-header match (`trimmed === \`[${table}]\``) when asserting listen ports so nested tables like `[db.pooler]` cannot satisfy `[db]`

### LSP-2

Suggested review order:
- **LSP-2 port invariants** `[schema]`
  - `supabase/config.toml:37` — `shadow_port = 54320`
  - `supabase/config.toml:44-47` — `[db.pooler] enabled = false`, `port = 54329`
  - `tests/unit/dev-toolchain/local-supabase-ports.test.ts:107-116` — three assertions for those values
- **Exact-table TOML resolution** (nested-table isolation)
  - `tests/unit/dev-toolchain/local-supabase-ports.test.ts:29-50` — `rawUnderExactTable` exact-header gate
  - `tests/unit/dev-toolchain/local-supabase-ports.test.ts:74-83` — `boolUnderExactTable` true/false (not string)

Reusable pattern: exact-`[header]` TOML key resolver that refuses nested tables (e.g. `[db.pooler]` must not satisfy `[db]`) when asserting config.toml listen ports

### LSP-3

Suggested review order:
- Instruction API-port sync (operator copy-paste URLs) · [public-api]
  - `docs/testing/Vitest-Integration-Guide.md:33`
  - `docs/testing/Vitest-Integration-Guide.md:60`
  - `docs/testing/Vitest-Integration-Guide.md:233`
  - `docs/testing/Design-And-Patterns.md:200`
  - `docs/testing/Design-And-Patterns.md:211`
  - `docs/runbooks/deploy.md:68`
- Agent DB-port warn text · [public-api]
  - `.cursor/agents/tdd-red.md:45`
- Unit pin covering the four instruction surfaces
  - `tests/unit/dev-toolchain/local-supabase-ports.test.ts:118` (third `it`)

Reusable pattern: Pin local-stack instruction docs with paired positive (`127.0.0.1:<new>`) + negative (`<old>`) substring asserts so a missed swap fails closed without parsing TOML in the docs test.

### LSP-4

Suggested review order:
- Port contract + exact-table TOML parse — `tests/unit/dev-toolchain/local-supabase-ports.test.ts:17` (`EXPECTED_PORTS` block) `[public-api]`; `:29` (`rawUnderExactTable`); `:85` (enabled-port assertions); `:107` (shadow/pooler freeze); `:118` (docs literal migration); `:143` (fixture scan + host-only probe pin)
- Hours isolation stays host-only (port-agnostic) — `lib/scheduling/hours-mutation-target.ts:23` `[security]`; probe expect — `tests/unit/scheduling/hours-mutation-target.test.ts:21`
- Authorized fixture literal swaps — `tests/unit/auth/staff-proxy.test.ts:31`; `tests/unit/reservations/reservation-integ-isolation.test.ts:121`; `tests/unit/inquiries/inquiry-integ-isolation.test.ts:121`

Reusable pattern: When local Supabase API ports move, keep isolation helpers host-only and pin migration with a filesystem scan that forbids the old API literal while requiring the new one plus a non-canonical loopback probe (`127.0.0.1:1`) so tests do not re-hardcode a specific port into the helper.

### LSP-5

Suggested review order:
- Denylist contract — `tests/unit/auth/seed-super-admin-claim.test.ts:10-11` `[security]`
- Seed scan using denylist — `tests/unit/auth/seed-super-admin-claim.test.ts:110` `[security]`
- Port characterization pin — `tests/unit/auth/seed-super-admin-claim.test.ts:180-185`

Reusable pattern: When the local Supabase API port moves, extend the seed HOST denylist with both old and new ports and pin both via a characterizing unit assertion — leave `seed.sql` unchanged.

## Suggested Review Order (collated)

Highest-risk first. The behavior change is the five listen ports; isolation and the seed denylist are preservation pins.

- [public-api] Enabled listen ports — `supabase/config.toml:10` `[api] port = 45321`; `:35` `[db] port = 45322`; `:97` `[studio] port = 45323`; `:108` `[local_smtp] port = 45324`; `:394` `[analytics] port = 45327`
- [schema] Unchanged shadow and disabled pooler — `supabase/config.toml:37` `shadow_port = 54320`; `:44-47` `[db.pooler]` disabled / `54329`
- [public-api] Instruction API/DB copy — `docs/testing/Vitest-Integration-Guide.md:33,60,233`; `docs/testing/Design-And-Patterns.md:200,211`; `docs/runbooks/deploy.md:68`; `.cursor/agents/tdd-red.md:45` (`127.0.0.1:45322`)
- [security] Hours isolation stays host-only — `lib/scheduling/hours-mutation-target.ts:23`; probe `tests/unit/scheduling/hours-mutation-target.test.ts:21` (`http://127.0.0.1:1`)
- [public-api] Fixture literals — `tests/unit/auth/staff-proxy.test.ts:31`; `tests/unit/reservations/reservation-integ-isolation.test.ts:121`; `tests/unit/inquiries/inquiry-integ-isolation.test.ts:121`; scan `tests/unit/dev-toolchain/local-supabase-ports.test.ts:143`
- [security] Seed denylist keeps both ports — `tests/unit/auth/seed-super-admin-claim.test.ts:10-11`; seed scan `:110`; pin `:180-185`

## Traceability (final)

Run: 2026-09-28 · plan: local_ports_tdd_b21be849 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| LSP-1 | LSP-1 | local-supabase-ports.test.ts::enabled local ports are the committed block below 49152 | supabase/config.toml `[api]` `[db]` `[studio]` `[local_smtp]` `[analytics]` | P1 | shipped |
| LSP-2 | LSP-2 | local-supabase-ports.test.ts::shadow port and disabled pooler stay on their current ports | supabase/config.toml `[db]` `[db.pooler]` | P1 | shipped |
| LSP-3 | LSP-3 | local-supabase-ports.test.ts::current local-stack instructions use the committed API and DB ports | docs/testing/Vitest-Integration-Guide.md, docs/testing/Design-And-Patterns.md, docs/runbooks/deploy.md, .cursor/agents/tdd-red.md | P1 | shipped |
| LSP-4 | LSP-4 | local-supabase-ports.test.ts::local URL fixtures cite API port 45321 and hours isolation accepts another loopback port | tests/unit/auth/staff-proxy.test.ts, tests/unit/scheduling/hours-mutation-target.test.ts, tests/unit/reservations/reservation-integ-isolation.test.ts, tests/unit/inquiries/inquiry-integ-isolation.test.ts | P1 | shipped |
| LSP-5 | LSP-5 | seed-super-admin-claim.test.ts::seed denylist rejects committed local API port 45321 and still rejects 54321 | tests/unit/auth/seed-super-admin-claim.test.ts `HOST_OR_ENV_VALUE` | P1 | shipped |

## Run metrics

Run: 2026-09-28 → 2026-09-28 · plan: local_ports_tdd_b21be849
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 19
Back-loops: LSP-2: 1 extra Red (Prettier wrap of `boolUnderExactTable`) and 1 extra Refactor re-verify
BLOCKED events: 1 — LSP-2 refactor Prettier signature wrap; resolved in-run before LSP-3
Issues: 0 filed · 0 attached · 10 left on ledger (below floor) — cap 3/run

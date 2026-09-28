# Local Supabase ports

**Status:** Draft
**Last updated:** 2026-09-28

## Scope

Local Supabase listen ports for this repository, beside
[dev-toolchain.md](./dev-toolchain.md) in the specs hub. v1 sets the five
enabled ports in `supabase/config.toml` to API `45321`, database `45322`,
Studio `45323`, local SMTP `45324`, and analytics `45327`, and points current
local-stack instructions and tests at the new API and database ports. Hosted
Supabase, `[auth]` signup flags, and the host-only isolation rule
(`127.0.0.1` / `localhost` / `[::1]`) stay as they are. Shadow stays `54320`;
the disabled pooler stays `54329`. An elevated WinNAT or Docker reset is not
how `supabase start` becomes bindable.

## Acceptance criteria

1. **LSP-1 — Enabled local ports are the committed block** —
   `supabase/config.toml` MUST set `[api] port` to `45321`, `[db] port` to
   `45322`, `[studio] port` to `45323`, `[local_smtp] port` to `45324`, and
   `[analytics] port` to `45327`. Each of those five values MUST be an integer
   strictly less than `49152`. A tree that still sets any of those keys to
   `54321`, `54322`, `54323`, `54324`, or `54327` MUST NOT satisfy this
   criterion.
   - Regression guard: `tests/unit/dev-toolchain/local-supabase-ports.test.ts`
     MUST read `supabase/config.toml` and assert all five table keys. A test
     that asserts only the API port MUST NOT satisfy this criterion.

2. **LSP-2 — Shadow and the disabled pooler stay on their current ports** —
   `[db] shadow_port` MUST remain `54320`. `[db.pooler] enabled` MUST remain
   `false` and `[db.pooler] port` MUST remain `54329`. This criterion does not
   require `54320` or `54329` to sit outside `54231–54630` or below `49152`.
   - Regression guard: the same unit test MUST assert those three values.
     A test that only checks the five enabled ports MUST NOT satisfy this
     criterion.

3. **LSP-3 — Current local-stack instructions use the new API and DB ports** —
   These files MUST name the committed ports and MUST NOT contain the old
   port token named here:
   - `docs/testing/Vitest-Integration-Guide.md` uses `http://127.0.0.1:45321`
     and MUST NOT contain `54321`.
   - `docs/testing/Design-And-Patterns.md` uses `http://127.0.0.1:45321` and
     MUST NOT contain `54321`.
   - `docs/runbooks/deploy.md` uses `127.0.0.1:45321` and MUST NOT contain
     `54321`.
   - `.cursor/agents/tdd-red.md` uses `127.0.0.1:45322` and MUST NOT contain
     `54322`.
   - `docs/verifier-reports/**`, `docs/findings/archive.md`, and
     `.cursor/plans/**` are outside this criterion.
   - Regression guard: the unit test MUST read those four files. A test that
     only updates `supabase/config.toml` MUST NOT satisfy this criterion.

4. **LSP-4 — Local URL fixtures use API port 45321, and isolation stays host-only** —
   These tests MUST cite port `45321` where they currently cite `54321` as a
   local Supabase URL:
   - `tests/unit/auth/staff-proxy.test.ts`
   - `tests/unit/scheduling/hours-mutation-target.test.ts`
   - `tests/unit/reservations/reservation-integ-isolation.test.ts`
   - `tests/unit/inquiries/inquiry-integ-isolation.test.ts`
   - `isIsolatedHoursMutationTarget` / `assertIsolatedHoursMutationTarget`
     MUST keep treating `127.0.0.1`, `localhost`, and `[::1]` as local on any
     port. A helper that accepts only port `45321` MUST NOT satisfy this
     criterion.
   - Regression guard: `tests/unit/scheduling/hours-mutation-target.test.ts`
     MUST accept one loopback URL whose port is not `45321`.

5. **LSP-5 — Seed denylist rejects the committed API port and the old one** —
   The host/port denylist in `tests/unit/auth/seed-super-admin-claim.test.ts`
   MUST reject `45321` inside `supabase/seed.sql` and MUST still reject
   `54321` and loopback hosts (`localhost`, `127.0.0.1`). Replacing `54321`
   with `45321` in that pattern MUST NOT satisfy this criterion.

## Implementation trace (non-normative)

| Criterion | Shipped path                                                                                                                                                                                                        | Test name                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| LSP-1     | `supabase/config.toml` (`[api]` `[db]` `[studio]` `[local_smtp]` `[analytics]`)                                                                                                                                     | `enabled local ports are the committed block below 49152`                                  |
| LSP-2     | `supabase/config.toml` (`[db]` `[db.pooler]`)                                                                                                                                                                       | `shadow port and disabled pooler stay on their current ports`                              |
| LSP-3     | `docs/testing/Vitest-Integration-Guide.md`, `docs/testing/Design-And-Patterns.md`, `docs/runbooks/deploy.md`, `.cursor/agents/tdd-red.md`                                                                           | `current local-stack instructions use the committed API and DB ports`                      |
| LSP-4     | `tests/unit/auth/staff-proxy.test.ts`, `tests/unit/scheduling/hours-mutation-target.test.ts`, `tests/unit/reservations/reservation-integ-isolation.test.ts`, `tests/unit/inquiries/inquiry-integ-isolation.test.ts` | `local URL fixtures cite API port 45321 and hours isolation accepts another loopback port` |
| LSP-5     | `tests/unit/auth/seed-super-admin-claim.test.ts` (`HOST_OR_ENV_VALUE`)                                                                                                                                              | `seed denylist rejects committed local API port 45321 and still rejects 54321`             |

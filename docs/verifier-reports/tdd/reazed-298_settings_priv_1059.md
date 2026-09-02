# Plan + TDD log — REAZED-298 settings privilege surface

Issue: [REAZED-298](https://linear.app/realized/issue/REAZED-298)
Mode: FIX
Owning spec: `docs/specs/branding-cms.md` **BC-1** (already normative: guests
may SELECT; writes go through staff-authenticated server actions / service
role). No spec edit this run — BC-1 plus the issue's GRANT/REVOKE/DROP
surface is the contract. Sibling pattern: scheduling.md §16 OH-PRIV.

Linear START posted 2026-09-02 (`Work started:` · plan `reazed-298_settings_privilege`). Issue is In Progress. Do not mark Done — C298-3 is BLOCKED (infra) and C298-4 is pending remote apply.

## Acceptance criteria

| # | Criterion | Risk | Layer | Test file | Test name | Command | Depends on |
| - | --------- | ---- | ----- | --------- | --------- | ------- | ---------- |
| C298-1 | Baseline `restaurant_settings` is SELECT-only for anon/authenticated: `GRANT SELECT`, `REVOKE INSERT, UPDATE, DELETE`, `DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings"` with no following `CREATE POLICY` of that authenticated FOR ALL | P0 | unit | `tests/unit/branding/schema.test.ts` | restaurant_settings grants are select-only for anon and authenticated | `pnpm test:unit tests/unit/branding/schema.test.ts` | none |
| C298-2 | Later `restaurant_settings` privilege sites (`20260818155638_restaurant_branding_cms.sql` and `20260825140000_operating_windows_privilege.sql`) carry the same GRANT/REVOKE/DROP (no authenticated FOR ALL CREATE) so `db reset` and already-applied remotes stay locked | P0 | unit | `tests/unit/branding/schema.test.ts` | restaurant_settings privilege forward drops authenticated FOR ALL and revokes DML | `pnpm test:unit tests/unit/branding/schema.test.ts` | C298-1 |
| C298-3 | Authenticated Data API cannot INSERT/UPDATE/DELETE `restaurant_settings`; anon can still SELECT the singleton | P0 | integration | `tests/integration/reservations/public-privileges.integ.test.ts` (existing privilege suite) | authenticated cannot UPDATE restaurant_settings via Data API | `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/reservations/public-privileges.integ.test.ts` | C298-1, C298-2 |
| C298-4 | Linked remote `tilcqrudqxznnpepxjqq` receives the privilege SQL (do not assume editing `20260825140000` re-runs) | P3 | manual-UAT | — | deploy runbook apply | docs/runbooks/deploy.md | C298-2 |
| C298-5 | New dated forward after `20260825140000` so remotes that already recorded that version still get the restaurant_settings DROP/REVOKE | P0 | unit | `tests/unit/branding/schema.test.ts` | restaurant_settings privilege has a post-25140000 dated forward | `pnpm test:unit tests/unit/branding/schema.test.ts` | C298-2 |

Red expected for C298-1: today's baseline still `CREATE POLICY "Allow authenticated full access to restaurant_settings" … FOR ALL TO authenticated` and has no `REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings`.

Do not fold REAZED-296 (cookie `setChefsPicksEnabled`) or REAZED-299 into this issue.

## C298-1 scoped spec excerpt

From `docs/specs/branding-cms.md` BC-1:

> Schema defines `restaurant_settings` as a single row (`id = 1`) with
> nullable `logo_url`. Guests may `SELECT`; writes go through
> staff-authenticated server actions (service role).

Issue constraint (independently verifiable): leftover authenticated
`FOR ALL` plus missing `REVOKE INSERT, UPDATE, DELETE` is a privilege-surface
deviation from BC-1. Mirror OH-PRIV: `GRANT SELECT` stays; `GRANT ALL` to
`service_role` stays; public SELECT RLS stays; service_role FOR ALL stays;
authenticated FOR ALL is dropped and not recreated.

Reuse `tests/unit/branding/schema.test.ts` (existing owner). Do not modify
existing tests. Add one new `it`.

Sibling pin: `tests/unit/scheduling/schema.test.ts` → "operating_windows
grants are select-only for anon and authenticated".

## Traceability (seed)

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C298-1 | BC-1 | schema.test.ts::restaurant_settings grants are select-only for anon and authenticated | `supabase/migrations/00000000000000_baseline.sql` | P0 | shipped |
| C298-2 | BC-1 | schema.test.ts::restaurant_settings privilege forward drops authenticated FOR ALL and revokes DML | `20260818155638_restaurant_branding_cms.sql`, `20260825140000_operating_windows_privilege.sql` | P0 | shipped |
| C298-3 | BC-1 | public-privileges.integ.test.ts::authenticated cannot UPDATE restaurant_settings via Data API | — | P0 | blocked |
| C298-4 | BC-1 | — | deploy runbook | P3 | manual-uat |
| C298-5 | BC-1 | schema.test.ts::restaurant_settings privilege has a post-25140000 dated forward | `20260902214500_restaurant_settings_privilege.sql` | P0 | shipped |

## Residual findings

### C298-1 red

RED confirmed. `pnpm test:unit tests/unit/branding/schema.test.ts`: 10 collected, 1 failed / 9 passed / 0 skipped. Failure: baseline lacks `REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated` (authenticated FOR ALL still created). Files: tests only.

### C298-1 green

GREEN confirmed. Source: `supabase/migrations/00000000000000_baseline.sql` (DROP authenticated FOR ALL without CREATE; REVOKE DML; GRANT SELECT + service_role GRANT ALL kept). Re-run: 10 passed / 0 skipped. Residual for C298-2: `20260818155638_restaurant_branding_cms.sql` still recreates authenticated FOR ALL (C298-2 must DROP/REVOKE in later forwards so `db reset` end-state stays locked).

### C298-1 refactor

Comment-only OH-PRIV alignment (`-- REAZED-298: BC-1 — …`). Verified this turn: branding unit 55 passed / 0 skipped; `pnpm lint --max-warnings 0` exit 0; `pnpm typecheck` exit 0; Prettier has no SQL parser (exit 2, not a format fail).

Suggested review order:
- Privilege lock [security] — `00000000000000_baseline.sql:699-712`
- Guest read + staff write stay [public-api] — public SELECT + service_role FOR ALL
- Pin — `tests/unit/branding/schema.test.ts:19`

Reusable pattern: Baseline SELECT-only lock comment matches OH-PRIV: `-- REAZED-NNN: <AC-id> — drop authenticated FOR ALL (keep DROP IF EXISTS; do not CREATE);` then `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` / keep `GRANT ALL` to `service_role`.

### C298-2 refactor

Suggested review order:
- Privilege lock [security] — `20260818155638_restaurant_branding_cms.sql:20-33` (DROP authenticated FOR ALL, no CREATE; GRANT SELECT / REVOKE DML / GRANT ALL service_role)
- Already-applied overlay [security] — `20260825140000_operating_windows_privilege.sql:39-44` (same DROP/GRANT/REVOKE; remotes that already recorded this stamp will not re-run it)
- Guest read + staff write stay [public-api] — public SELECT + service_role FOR ALL kept in both files
- Pin — `tests/unit/branding/schema.test.ts:51`

Reusable pattern: After the baseline SELECT-only lock, copy the same DROP/GRANT/REVOKE/GRANT ALL strings into every later file that still created authenticated FOR ALL so `db reset` end-state stays locked.

### C298-3 — BLOCKED (infra)

Suite: `tests/integration/reservations/public-privileges.integ.test.ts` did not execute.
Command: `RESTAURANT_INTEGRATION_STRICT=true pnpm test:integration tests/integration/reservations/public-privileges.integ.test.ts`
Observed: this VM has no `docker` / `podman` / `supabase` CLI; local stack cannot start.
Remedy: `npx supabase start; npx supabase db reset --local`, then re-run STRICT. A skipped suite is not Green.
Note: do not treat C298-3 as shipped.

### C298-5 refactor

Cleanups: comment/header alignment only on `20260902214500_restaurant_settings_privilege.sql` (OH-PRIV “already-applied … (linked/remote)” + dual-site note + “keep DROP IF EXISTS; do not CREATE”). DROP/GRANT/REVOKE/NOTIFY bytes unchanged.

Re-verify (orchestrator, this turn): `pnpm test:unit tests/unit/branding` — 57 passed / 0 skipped; `pnpm lint --max-warnings 0` exit 0; `pnpm typecheck` exit 0.

Suggested review order:
- Remote-forward necessity [schema]: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:1`
- Idempotent dual-site note: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:2`
- Issue header (SELECT-only / drop FOR ALL): `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:7`
- OH-PRIV “do not CREATE” guard: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:10`
- DROP authenticated FOR ALL [security]: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:12`
- GRANT SELECT / REVOKE DML [security]: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:13`
- GRANT ALL `service_role` [auth]: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:15`
- PostgREST reload: `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:17`

Reusable pattern: Privilege-lock remotes that already recorded an edited dated forward need a new later stamp; copy the sibling “already-applied <stamp> (linked/remote)” header plus the OH-PRIV “keep DROP IF EXISTS; do not CREATE” block — do not fold into an already-applied later file even if the test’s stamp floor would still pass.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Settings privilege lock `[security]` `[public-api]`

- `supabase/migrations/00000000000000_baseline.sql:699` — `-- REAZED-298: BC-1 — drop authenticated FOR ALL (keep DROP IF EXISTS; do not CREATE);`
- `supabase/migrations/00000000000000_baseline.sql:701` — `DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings"` (no following CREATE of that policy)
- `supabase/migrations/00000000000000_baseline.sql:710` — `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` for anon, authenticated
- `supabase/migrations/00000000000000_baseline.sql:712` — `GRANT ALL … TO service_role` stays
- `supabase/migrations/00000000000000_baseline.sql:694` — public SELECT policy stays
- `supabase/migrations/00000000000000_baseline.sql:704` — service_role FOR ALL stays

### 2. Reset + overlay copies `[security]` `[schema]`

- `supabase/migrations/20260818155638_restaurant_branding_cms.sql:20-33` — same DROP/GRANT/REVOKE so `db reset` end-state stays locked
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:39-44` — same surface on the already-applied OH-PRIV overlay (in-place edit does not re-run on remotes)

### 3. Remote forward after `20260825140000` `[security]` `[schema]`

- `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:1` — new dated file for remotes that already recorded `20260825140000`
- `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:12` — DROP authenticated FOR ALL
- `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:13` — GRANT SELECT / REVOKE DML
- `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:15` — GRANT ALL service_role
- `supabase/migrations/20260902214500_restaurant_settings_privilege.sql:17` — `NOTIFY pgrst, 'reload schema'`

### 4. Pins `[schema]`

- `tests/unit/branding/schema.test.ts:19` — C298-1 baseline SELECT-only
- `tests/unit/branding/schema.test.ts:51` — C298-2 later-file lock
- `tests/unit/branding/schema.test.ts:80` — C298-5 post-25140000 dated forward

## Traceability (final)

Run: 2026-09-02 · plan: reazed-298_settings_priv_1059 · issue: REAZED-298

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C298-1 | branding-cms.md BC-1 | schema.test.ts::restaurant_settings grants are select-only for anon and authenticated | `supabase/migrations/00000000000000_baseline.sql` | P0 | shipped |
| C298-2 | branding-cms.md BC-1 | schema.test.ts::restaurant_settings privilege forward drops authenticated FOR ALL and revokes DML | `20260818155638_restaurant_branding_cms.sql`, `20260825140000_operating_windows_privilege.sql` | P0 | shipped |
| C298-3 | branding-cms.md BC-1 | public-privileges.integ.test.ts::authenticated cannot UPDATE restaurant_settings via Data API | — | P0 | blocked |
| C298-4 | branding-cms.md BC-1 | — | `docs/runbooks/deploy.md` + `20260902214500_restaurant_settings_privilege.sql` | P3 | manual-uat |
| C298-5 | branding-cms.md BC-1 | schema.test.ts::restaurant_settings privilege has a post-25140000 dated forward | `supabase/migrations/20260902214500_restaurant_settings_privilege.sql` | P0 | shipped |

## Run metrics

Run: 2026-09-02 → 2026-09-02 · plan: reazed-298_settings_priv_1059
Criteria: 3 shipped · 1 manual-uat · 1 blocked · 5 total
Phases delegated: 9 (C298-1 R/G/Rf · C298-2 R/G/Rf · C298-5 R/G/Rf)
Back-loops: none
BLOCKED events: 1 — C298-3: infra (no docker/podman/supabase; local stack cannot start)
Issues: 0 filed · 0 attached · 3 left on ledger (below floor) — cap 3/run

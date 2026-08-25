# Vitest integration guide

**Status:** Reference  
**Last updated:** 2026-08-25

## Prerequisites

Most suites assume a local stack:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --fail-on error
```

`db reset --local` applies `supabase/migrations/00000000000000_baseline.sql`
(already defines `replace_operating_windows`) plus later files, then loads
`supabase/seed.sql` when `[db.seed] enabled = true` in `supabase/config.toml`.

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. `vitest.integration.config.ts` does **not** load
unprefixed `.env.local` keys (Vite `envPrefix` drops `NEXT_PUBLIC_*` and
`SUPABASE_*`). Strict runs need those exported in the shell.

## Linked remote (OH-SAVE)

The Red target for
`tests/integration/scheduling/replace-operating-windows.integ.test.ts` is the
linked remote (`tilcqrudqxznnpepxjqq`,
https://tilcqrudqxznnpepxjqq.supabase.co), not a local `db reset`. Local
baseline already has the RPC, so a local-only run cannot catch a deployed
PostgREST schema-cache miss (PGRST202). Repo SQL ≠ the hosted cache until
`20260818162000_operating_hour_segments.sql` is applied — see
[../runbooks/deploy.md](../runbooks/deploy.md). Snapshot/restore recipe:
[Design-And-Patterns.md](./Design-And-Patterns.md).

```powershell
# Export URL + keys from .env.local into this shell, then:
$env:RESTAURANT_INTEGRATION_STRICT = 'true'
pnpm test:integration tests/integration/scheduling/replace-operating-windows.integ.test.ts
```

## Layout

- Config: `vitest.integration.config.ts`
- Setup: `tests/integration/setup.ts` (honours `RESTAURANT_INTEGRATION_STRICT`)
- Helpers: `tests/integration/helpers/`
- Tests: `tests/integration/**/*.integ.test.ts`

## Skip vs strict

Suites use `describe.skipIf(!authEnvReady)` when Supabase env is absent.
With `RESTAURANT_INTEGRATION_STRICT=true`, missing env **throws** at setup (no silent skip).

```powershell
$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration
```

## Running

```powershell
pnpm test:integration
pnpm test:integration tests/integration/smoke.integ.test.ts
```

# Vitest integration guide

**Status:** Reference  
**Last updated:** 2026-06-27

## Prerequisites

```powershell
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --fail-on error
```

`db reset --local` applies `supabase/migrations/00000000000000_baseline.sql`, then
loads `supabase/seed.sql` when `[db.seed] enabled = true` in `supabase/config.toml`.

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

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

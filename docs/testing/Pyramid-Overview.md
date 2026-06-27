# Testing pyramid

**Status:** Reference  
**Last updated:** 2026-06-27

| Layer | Path | Command | When |
| --- | --- | --- | --- |
| Unit | `tests/unit/**` | `pnpm test:unit` | Pure logic, mocked Supabase, server-action guards |
| Integration | `tests/integration/**` | `pnpm test:integration` | Real Postgres/RLS; needs local Supabase |
| E2E | `tests/e2e/**` | `pnpm test:e2e` | Browser flows; dev server on `:3000` |

Gates: `pnpm lint`, `pnpm typecheck` — criteria in
[../specs/dev-toolchain.md](../specs/dev-toolchain.md) (G-T1 typecheck, G-L1 lint).

Integration strict mode (fail if env missing instead of skip):

```powershell
$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration
```

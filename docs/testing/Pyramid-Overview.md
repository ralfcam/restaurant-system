# Testing pyramid

**Status:** Reference  
**Last updated:** 2026-09-15

| Layer       | Path                   | Command                 | When                                              |
| ----------- | ---------------------- | ----------------------- | ------------------------------------------------- |
| Unit        | `tests/unit/**`        | `pnpm test:unit`        | Pure logic, mocked Supabase, server-action guards |
| Integration | `tests/integration/**` | `pnpm test:integration` | Real Postgres/RLS; needs local Supabase           |
| E2E         | `tests/e2e/**`         | `pnpm test:e2e`         | Browser flows; dev server on `:3000`              |

Gates: `pnpm lint`, `pnpm typecheck`, `pnpm format` / `pnpm format:check` —
criteria in [../specs/dev-toolchain.md](../specs/dev-toolchain.md) (G-T1
typecheck, G-L1 lint, G-F1 Prettier).

`vitest.integration.config.ts` sets `test.env.RESTAURANT_INTEGRATION_STRICT` to
`"true"` (MT-4d), so a bare `pnpm test:integration` throws at
`tests/integration/setup.ts` when auth env is missing (no silent skip). A
parent-shell unset does not override `test.env`. How-to:
[Vitest-Integration-Guide.md](./Vitest-Integration-Guide.md).

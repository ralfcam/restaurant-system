# Vitest unit guide

**Status:** Reference  
**Last updated:** 2026-06-27

## Layout

- Config: `vitest.unit.config.ts`
- Setup: `tests/unit/setup.ts`
- Tests: `tests/unit/**/*.test.ts`

## Conventions

- Mock Supabase at `@/lib/supabase/*` boundaries — no real network or Postgres.
- DOM tests: add `// @vitest-environment happy-dom` at the top of the file.
- One behavior per test; name tests after the criterion they prove.
- Assert one exact HTTP status or error shape per scenario.

## Running

```powershell
pnpm test:unit
pnpm test:unit tests/unit/smoke.test.ts
```

Promoted recipes belong in [Design-And-Patterns.md](./Design-And-Patterns.md).

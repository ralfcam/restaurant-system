# Deploy runbook

**Status:** Draft  
**Last updated:** 2026-06-27

## Vercel

- Repo: [ralfcam/restaurant-system](https://github.com/ralfcam/restaurant-system)
- Merges to `main` deploy via v0/Vercel integration (see root README).

## Env vars (production)

Set in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose the service role key to the client bundle.

## Supabase

**Linked project:** `supabase-green-tree` (ref `tilcqrudqxznnpepxjqq`). Verify with
`npx supabase projects list` (exactly one `LINKED` marker).

### Schema vs seed

| Artifact | Path | Loaded on `db reset` |
| --- | --- | --- |
| Schema (tables, RLS, triggers) | `supabase/migrations/00000000000000_baseline.sql` | Yes — migrations step |
| Reference data | `supabase/seed.sql` | Yes — when `[db.seed] enabled = true` in `supabase/config.toml` |

`seed.sql` holds `operating_windows` (7 rows) and `menu_items` (120 rows). Schema
DDL must not live in seed files.

### Migration policy

Single idempotent baseline — extend `00000000000000_baseline.sql` for schema changes
instead of adding dated migration files. Policy detail:
`.cursor/rules/supabase-migrations.mdc`.

### Reset database

**Local** (Docker stack):

```powershell
npx supabase start
npx supabase db reset --local
```

**Linked remote** (non-production; drops and recreates from migrations + seed):

```powershell
npx supabase db reset --linked --yes
```

Schema-only (skip seed): append `--no-seed` to either command.

After editing migrations, verify:

```powershell
npx supabase db lint --linked --fail-on error
```

Use `--local` instead of `--linked` when testing against the local stack.

## Pre-deploy checks

```powershell
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
npx supabase db lint --linked --fail-on error
```

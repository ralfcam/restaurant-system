# Deploy runbook

**Status:** Draft  
**Last updated:** 2026-08-25

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

| Artifact                             | Path                                                                 | Loaded on `db reset`                                            |
| ------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Schema (tables, RLS, triggers)       | `supabase/migrations/00000000000000_baseline.sql`                    | Yes — migrations step                                           |
| Forward: opening-hour segments       | `supabase/migrations/20260818162000_operating_hour_segments.sql`     | Yes on local reset; apply on already-baselined remotes          |
| Forward: operating_windows privilege | `supabase/migrations/20260825140000_operating_windows_privilege.sql` | Yes on local reset; apply on already-baselined remotes          |
| Reference data                       | `supabase/seed.sql`                                                  | Yes — when `[db.seed] enabled = true` in `supabase/config.toml` |

`seed.sql` holds `restaurant_settings` (singleton, no custom logo),
`operating_windows` (7 rows), and `menu_items` (120 rows from the sample
`lib/menu-catalog.json` catalog). The public `branding` storage bucket is created
by migrations, not seed. The template does not ship static logo assets under
`public/images/`; guest and staff surfaces show the restaurant name only until a
logo is uploaded via the branding CMS. Schema DDL must not live in seed files.

### Migration policy

Single idempotent baseline — extend `00000000000000_baseline.sql` for schema changes
instead of adding dated migration files. Policy detail:
`.cursor/rules/supabase-migrations.mdc`.

`20260818162000_operating_hour_segments.sql` and
`20260825140000_operating_windows_privilege.sql` are the forward-only exceptions
for remotes that already applied baseline (see below).

### Linked remote vs repo SQL

Repo SQL is not the same as the deployed PostgREST cache. Local `db reset`
already defines `replace_operating_windows(p_windows jsonb)` in the baseline
(`DELETE FROM operating_windows WHERE TRUE` — hosted safe-delete, error 21000
without a predicate). Linked remotes that applied an older baseline must apply
`20260818162000_operating_hour_segments.sql` (drop `UNIQUE(day_of_week)`, add
`label` / `sort_order` / `guest_note`, `CREATE OR REPLACE` the RPC,
`REVOKE` from `PUBLIC`/`anon`/`authenticated`, `GRANT EXECUTE` to `service_role`,
`NOTIFY pgrst, 'reload schema'`). Until that
file is applied, staff Save on `/admin/scheduling` misses the function
(PGRST202 / schema cache). Spec: [../specs/scheduling.md](../specs/scheduling.md)
OH-SAVE (§15).

On `tilcqrudqxznnpepxjqq` that version is recorded as `20260818162000` /
`operating_hour_segments`. That is **not** a full `db push`: remote
`schema_migrations` remains forked from the repo (later local files are still
missing). Do not push the whole history onto this project.

`20260825140000_operating_windows_privilege.sql` is the OH-PRIV sibling: drop
the authenticated `FOR ALL` policy on `operating_windows`
(`DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows"`;
no `CREATE`), then the same `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE`
strings as baseline for `anon, authenticated`. Until that file is applied on a
forked remote that still has the old policy or DML grants, a logged-in Data API
client can mutate hours. Spec: [../specs/scheduling.md](../specs/scheduling.md)
OH-PRIV (§16). Apply per the recipe below; do not `db push`.

### Apply a single forward migration on an already-baselined remote

Do not use `db push` or `db reset --linked` for this — the file already ends
with `NOTIFY pgrst, 'reload schema'`, and a full push/reset would try to
replay history the remote has diverged from.

1. Run the contents of `supabase/migrations/20260818162000_operating_hour_segments.sql`
   against `tilcqrudqxznnpepxjqq` via the Supabase MCP `execute_sql` tool
   (single file, one call).
2. If `supabase_migrations.schema_migrations` has no row for this version yet,
   record it:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('20260818162000', 'operating_hour_segments');
   ```

   Alternatively, `npx supabase migration repair 20260818162000 --status applied`
   marks the same history row applied — but `migration repair` only updates
   `schema_migrations`, it does not run the SQL, so step 1 is still required first.

3. Verify:

   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations
   WHERE version = '20260818162000';
   ```

### Apply `20260825140000_operating_windows_privilege.sql` on an already-baselined remote

Do not use `db push` or `db reset --linked` for this — the file already ends
with `NOTIFY pgrst, 'reload schema'`, and a full push/reset would try to
replay history the remote has diverged from.

1. Run the contents of `supabase/migrations/20260825140000_operating_windows_privilege.sql`
   against `tilcqrudqxznnpepxjqq` via the Supabase MCP `execute_sql` tool
   (single file, one call).
2. If `supabase_migrations.schema_migrations` has no row for this version yet,
   record it:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('20260825140000', 'operating_windows_privilege');
   ```

   Alternatively, `npx supabase migration repair 20260825140000 --status applied`
   marks the same history row applied — but `migration repair` only updates
   `schema_migrations`, it does not run the SQL, so step 1 is still required first.

3. Verify:

   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations
   WHERE version = '20260825140000';
   ```

   Confirm `has_table_privilege('authenticated', 'operating_windows', 'INSERT')`
   is false and the authenticated `FOR ALL` policy is gone.

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

`pnpm lint` uses the flat ESLint config at `eslint.config.mjs` (G-L1 in
[../specs/dev-toolchain.md](../specs/dev-toolchain.md)). `package.json`
`scripts.lint` pins `--max-warnings 0`. Gitignored Supabase CLI trees
(`supabase/.temp/**`, `supabase/.branches/**`) are in `globalIgnores`.
`pnpm format` / `pnpm format:check` are the Prettier scripts (G-F1).
`pnpm exec prettier` resolves. Snapshot trees `docs/verifier-reports` and
`docs/findings/runs` are prettierignored. `/commit` formats the dirty set
only; a whole-tree `pnpm format` is a separate pass (do not mix it into a
feature commit).

```powershell
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test:unit
pnpm build
npx supabase db lint --linked --fail-on error
```

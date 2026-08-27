# Deploy runbook

**Status:** Draft  
**Last updated:** 2026-08-27

## Vercel

Canonical host is the **git-linked** project `restaurant-system` on team
`ralfcams-projects` — not the v0 chat project, and not `syntex-global`.

- Dashboard: [ralfcams-projects/restaurant-system](https://vercel.com/ralfcams-projects/restaurant-system)
- Git: [ralfcam/restaurant-system](https://github.com/ralfcam/restaurant-system)
- Team slug: `ralfcams-projects`
- `teamId` / `orgId`: `team_MP13K4M0To2S4Duu2kknllAb`
- `projectId`: `prj_wFVDqQOtf6cjuUXscIoHDbtHzTTz` (from `.vercel/project.json` after `vercel link`; that directory is gitignored)
- Merges to `main` deploy.
- Production aliases: [restaurant-system-ralfcams-projects.vercel.app](https://restaurant-system-ralfcams-projects.vercel.app), [restlink.realized.dev](https://restlink.realized.dev)

Historical / chat only: v0 project
[prj_Be4qMWXY4RzLyIZOq2jgTicLj4CO](https://v0.app/chat/projects/prj_Be4qMWXY4RzLyIZOq2jgTicLj4CO)
and hostname `next-js-restaurant-system-mvp.vercel.app` are a **different**
project. Do not treat them as this app’s deploy target. Do not retarget
`syntex-global` (`prj_oWhr772lrsaNsUKWhpa0FAgle2p4`, `ralfcam/Syntex-V0`).

MCP (`plugin-vercel-vercel`) has **no env-var tools**. This MCP token’s
`list_projects` may only return `syntex-global`; `get_project` /
`list_deployments` on this `prj_` have 404’d / 403’d. Use the CLI for link,
env, and redeploy; keep `.vercel/` local.

### CLI recipe

Do **not** `npx vercel --prod` (or MCP `deploy_to_vercel`) — that uploads a
new tree and bypasses the git link. After env changes, redeploy the existing
git production deployment.

Quote `production,preview` in PowerShell (`$targets = 'production,preview'`)
so the comma is not parsed as an array.

```powershell
npx vercel whoami
npx vercel link --yes --scope ralfcams-projects --project restaurant-system
npx vercel env ls

# URL is public (this runbook’s hosted ref). Keys: pipe from
# `npx supabase projects api-keys --project-ref tilcqrudqxznnpepxjqq`, do not echo.
$targets = 'production,preview'
'https://tilcqrudqxznnpepxjqq.supabase.co' | npx vercel env add NEXT_PUBLIC_SUPABASE_URL $targets --yes --no-sensitive
# anon → NEXT_PUBLIC_SUPABASE_ANON_KEY (same $targets, --no-sensitive)
# service_role → SUPABASE_SERVICE_ROLE_KEY ($targets --sensitive)

npx vercel ls restaurant-system --scope ralfcams-projects
npx vercel redeploy <production-deployment-url>
npx vercel inspect <new-or-aliased-url> --scope ralfcams-projects
npx vercel curl / --deployment <production-url>
```

## Env vars (production + preview)

CLI `vercel env add` (targets `production,preview` — staging PRs use the same
hosted backend). Never use local Docker keys (`127.0.0.1:54321`).

- `NEXT_PUBLIC_SUPABASE_URL` — `https://tilcqrudqxznnpepxjqq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose the service role key to the client bundle. Never commit it.

## Supabase

**Linked project:** `supabase-green-tree` (ref `tilcqrudqxznnpepxjqq`). Verify with
`npx supabase projects list` (exactly one `LINKED` marker).

### Schema vs seed

| Artifact                             | Path                                                                 | Loaded on `db reset`                                                |
| ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Schema (tables, RLS, triggers)       | `supabase/migrations/00000000000000_baseline.sql`                    | Yes — migrations step                                               |
| Forward: opening-hour segments       | `supabase/migrations/20260818162000_operating_hour_segments.sql`     | Yes on local reset; apply on already-baselined remotes              |
| Forward: operating_windows privilege | `supabase/migrations/20260825140000_operating_windows_privilege.sql` | Yes on local reset; apply on already-baselined remotes              |
| Forward: public catalog privileges   | `supabase/migrations/20260827160000_public_catalog_privileges.sql`   | Yes on local reset; apply when `20260825140000` is already recorded |
| Reference data                       | `supabase/seed.sql`                                                  | Yes — when `[db.seed] enabled = true` in `supabase/config.toml`     |

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

`20260818162000_operating_hour_segments.sql`,
`20260825140000_operating_windows_privilege.sql`, and
`20260827160000_public_catalog_privileges.sql` are the forward-only exceptions
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
strings as baseline for `anon, authenticated`, plus
`GRANT ALL ON TABLE operating_windows TO service_role` in that same file.
The same file also
`GRANT ALL ON TABLE blocked_dates TO service_role`, and the same for
`reservations` and `menu_items` (EARLY-PRIV). That does not drop those tables'
authenticated `FOR ALL` policies (REAZED-299). It also carries RES-PRIV
(`GRANT INSERT` / `REVOKE SELECT, UPDATE, DELETE` on `reservations`;
`DROP POLICY IF EXISTS "Allow public read reservations"`, no `CREATE`) and
PUBLIC-READ-PRIV (`GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` on
`blocked_dates` and `menu_items`). If `20260825140000` is already recorded,
those catalog strings must be applied via
`20260827160000_public_catalog_privileges.sql` (editing an applied file does
not re-run). Spec: [../specs/scheduling.md](../specs/scheduling.md)
OH-PRIV (§16), EARLY-PRIV (§17), PUBLIC-READ-PRIV (§18). Apply per the recipes
below; do not `db push`. Until `20260825140000` is applied on a forked remote
that still has the old hours policy or DML grants, a logged-in Data API client
can mutate hours.

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

**UAT freshness:** 2026-08-27 — apply this file, then
`has_table_privilege('service_role', '<t>', 'SELECT')` (and INSERT/UPDATE/DELETE)
for `operating_windows`, `blocked_dates`, `reservations`, and `menu_items`
(EARLY-PRIV-remote-GRANT; deferred until remote apply).

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
   is false and the authenticated `FOR ALL` policy is gone. Confirm
   `has_table_privilege('service_role', 'operating_windows', 'SELECT')` (and
   INSERT/UPDATE/DELETE) is true — `GRANT ALL` is in that same file. Confirm
   the same `has_table_privilege('service_role', '<t>', 'SELECT')` (and
   INSERT/UPDATE/DELETE) is true for `blocked_dates`, `reservations`, and
   `menu_items`. If this version is already recorded, apply
   `20260827160000_public_catalog_privileges.sql` for RES-PRIV / PUBLIC-READ-PRIV
   (below) instead of re-running this file.

### Apply `20260827160000_public_catalog_privileges.sql` on an already-baselined remote

**UAT freshness:** 2026-08-27 — apply this file when `20260825140000` is already
recorded (M1-linked-remote-apply; do not `db push`). Then confirm
`has_table_privilege('anon', 'reservations', 'INSERT')` is true and
`has_table_privilege('anon', 'reservations', 'SELECT')` is false; confirm
`has_table_privilege('anon', 'blocked_dates', 'SELECT')` and
`has_table_privilege('anon', 'menu_items', 'SELECT')` are true and INSERT is
false for both.

Do not use `db push` or `db reset --linked` for this — the file already ends
with `NOTIFY pgrst, 'reload schema'`, and a full push/reset would try to
replay history the remote has diverged from.

1. Run the contents of `supabase/migrations/20260827160000_public_catalog_privileges.sql`
   against `tilcqrudqxznnpepxjqq` via the Supabase MCP `execute_sql` tool
   (single file, one call).
2. If `supabase_migrations.schema_migrations` has no row for this version yet,
   record it:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('20260827160000', 'public_catalog_privileges');
   ```

   Alternatively, `npx supabase migration repair 20260827160000 --status applied`
   marks the same history row applied — but `migration repair` only updates
   `schema_migrations`, it does not run the SQL, so step 1 is still required first.

3. Verify:

   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations
   WHERE version = '20260827160000';
   ```

   Confirm `has_table_privilege('anon', 'reservations', 'INSERT')` is true and
   `has_table_privilege('anon', 'reservations', 'SELECT')` is false. Confirm
   the same INSERT/SELECT split for `authenticated`. Confirm
   `has_table_privilege('anon', 'blocked_dates', 'SELECT')` and
   `has_table_privilege('anon', 'menu_items', 'SELECT')` are true, and INSERT
   is false for both. Confirm policy `"Allow public read reservations"` is gone.

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

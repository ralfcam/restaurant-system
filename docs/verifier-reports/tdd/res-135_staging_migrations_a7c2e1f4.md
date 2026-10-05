# TDD log: res-135_staging_migrations_a7c2e1f4

### G-MIG1

Suggested review order:
- Push trigger is `staging` only: `.github/workflows/staging-migrations.yml:5` [security]
- Apply step runs `npx supabase db push`: `.github/workflows/staging-migrations.yml:25` [schema]
- Token is contents read: `.github/workflows/staging-migrations.yml:12` [security]
Reusable pattern: Workflow contract tests should strip YAML comments and quoted strings, then parse `on.push.branches` and `run` blocks, so a comment cannot satisfy `db push` or hide `db reset`.

### G-MIG2

Suggested review order:
- Fail-closed apply step: `.github/workflows/staging-migrations.yml:21` [schema]
- Push command does not swallow a non-zero exit: `.github/workflows/staging-migrations.yml:25` [schema]
- Literal `false` required and literal `true` rejected on the job or the `db push` step: `tests/unit/dev-toolchain/staging-migrations-ci.test.ts:301`
Reusable pattern: Require an explicit `continue-on-error: false` scalar on the mutating Actions step; an omitted key is the platform default and must not count as a fail-closed pin.

### G-MIG3

Suggested review order:
- PR trigger is `staging` plus `supabase/migrations/**`: `.github/workflows/staging-migrations.yml:6` [security]
- Apply stays on push so a pull request cannot `db push`: `.github/workflows/staging-migrations.yml:16` [security]
- Validate job rejects non-SQL and empty files, then states merge will apply: `.github/workflows/staging-migrations.yml:31` [schema]
Reusable pattern: When one workflow lists both `push` and `pull_request`, gate the mutating job and the check job with `github.event_name`; a `paths` filter does not stop the other event from running every job.

### G-MIG4

Suggested review order:
- Apply-step credentials come from GitHub secrets: `.github/workflows/staging-migrations.yml:23` [security]
- Database password is the same secrets binding: `.github/workflows/staging-migrations.yml:24` [security]
- Only that step runs `npx supabase db push`: `.github/workflows/staging-migrations.yml:25` [security]
Reusable pattern: Put Supabase CLI credentials on the `db push` step `env`, not the job, so earlier actions such as checkout do not inherit `SUPABASE_DB_PASSWORD`.

### G-MIG5

Suggested review order:
- Keep schema apply off production
  - `tests/unit/dev-toolchain/staging-migrations-ci.test.ts:574` — cross-workflow `db push` scan for push/`pull_request` on `main`
  - `.github/workflows/staging-migrations.yml:16` [security] — apply job runs only for a push of `refs/heads/staging`
  - `.github/workflows/staging-migrations.yml:5` [security] — `on.push.branches` is `staging` only
Reusable pattern: Pin a mutating job with `github.event_name == 'push' && github.ref == 'refs/heads/<branch>'`. `github.ref_name == '<branch>'` is the pull-request head name, so it does not keep `db push` off `pull_request`.

## Suggested Review Order (collated)

Highest-risk first.

1. **Secrets and apply blast radius [security]**
   - `.github/workflows/staging-migrations.yml:16` — apply only on push of `refs/heads/staging`
   - `.github/workflows/staging-migrations.yml:5` — `on.push.branches` is `staging` only
   - `.github/workflows/staging-migrations.yml:23` — `SUPABASE_ACCESS_TOKEN` from `secrets.*`
   - `.github/workflows/staging-migrations.yml:24` — `SUPABASE_DB_PASSWORD` from `secrets.*` on the `db push` step only
   - `.github/workflows/staging-migrations.yml:6` — PR trigger is `staging` + `supabase/migrations/**`
2. **Fail-closed schema apply [schema]**
   - `.github/workflows/staging-migrations.yml:21` — `continue-on-error: false`
   - `.github/workflows/staging-migrations.yml:25` — `npx supabase db push` (no `db reset`, no swallowed exit)
   - `.github/workflows/staging-migrations.yml:33` — PR validate rejects non-SQL / empty files and does not apply
3. **Read-only token [security]**
   - `.github/workflows/staging-migrations.yml:12` — `permissions: contents: read`

## Traceability (final)

Run: 2026-10-05 · plan: res-135_staging_migrations_a7c2e1f4 · issue: RES-135

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-MIG1 | dev-toolchain.md G-MIG1 | staging-migrations-ci.test.ts::push to staging runs supabase db push | .github/workflows/staging-migrations.yml | P1 | shipped |
| G-MIG2 | dev-toolchain.md G-MIG2 | staging-migrations-ci.test.ts::staging apply job fails closed | .github/workflows/staging-migrations.yml | P0 | shipped |
| G-MIG3 | dev-toolchain.md G-MIG3 | staging-migrations-ci.test.ts::PRs that touch supabase/migrations run a pre-merge check | .github/workflows/staging-migrations.yml | P1 | shipped |
| G-MIG4 | dev-toolchain.md G-MIG4 | staging-migrations-ci.test.ts::staging apply credentials come from GitHub secrets | .github/workflows/staging-migrations.yml | P0 | shipped |
| G-MIG5 | dev-toolchain.md G-MIG5 | staging-migrations-ci.test.ts::no workflow applies migrations on main | .github/workflows/staging-migrations.yml | P0 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: res-135_staging_migrations_a7c2e1f4
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 15
Back-loops: none
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached · 19 left on ledger (Linear MCP blocked; attach-only) — cap 3/run

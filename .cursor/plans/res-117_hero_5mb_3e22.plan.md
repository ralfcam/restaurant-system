## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under `docs/specs/**` (managed Cloud: the exact path listed in `## Permissions Requested`), (2) appending Refactor close-out sections to `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase, and (3) at close-out, `## Suggested Review Order (collated)`, `## Traceability (final)`, and `## Run metrics` in the same tdd log. Managed Cloud only, before execution: this work-order at `.cursor/plans/res-117_hero_5mb_3e22.plan.md`. Findings are not written to `docs/findings/**` on Cloud; they are listed in the final report and PR body instead. After a spec write, `pnpm exec prettier --write` that file only. Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source change** from `tdd-green` (this includes the new `supabase/migrations/**` file, `lib/**`, `components/**`, `messages/**`, `next.config.mjs`). **Every cleanup / re-verify** from `tdd-refactor`. Run them sequentially, one phase at a time, honoring each phase's exit condition before the next Task call.
- Do not mark a phase done on subagent assertion alone. The phase's own exit condition must be visible in the returned report, and the orchestrator re-runs the target test itself (read-only) before recording evidence.
- **One Task call per phase.** If a phase lacks its own explicit entry, STOP.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` / `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`, `src/**`, or `supabase/**` yourself. The only mechanical exception is `pnpm exec prettier --write` on paths already dirty from this run, after close-out.
- The tdd-guard is armed as the first execution action and disarmed as the last. While a phase is set, the parent agent makes NO protected writes. Evidence is recorded with `node .cursor/hooks/tdd-guard.mjs evidence <criterion> red|green|refactor --agent-id <real Task agentId>`.
- No write to `.cursor/hooks/**` or any guard state file by any means other than the documented `tdd-guard.mjs` CLI verbs.
- A skipped test is not progress. All criteria here are `unit` (no infra), so any skipped / 0-test run is BLOCKED.
- Managed Cloud one-shot: after close-out and the format pass, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. If the CodeRabbit gate returns unavailable, record it, do not push, and stop. Never `gh pr ready`. Never `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-117_hero_5mb_3e22.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: RES
- Project: restaurant-system V-0.5 (existing; from the issue)
- Work type: implementation (sensitive migration ticket)
- Milestone: M4 — Code Complete (Feature Freeze)
- Mixed design + implementation: no
- Clarification: resolved by human comments (`clarify:RES-117:branding-cms:BC-9`, 10 Oct; migration accept 14 Oct; CLI hold lifted 15 Oct)

## Issue & Root Cause

- Issue: RES-117 — a hero image between 2 and 4 MB passes `validateHeroUpload` (`MAX_HERO_BYTES` = 4 MB) but the `branding` bucket `file_size_limit` is 2097152, so storage rejects it and the editor shows the generic `heroUploadFailed` toast. Expected: PNG/JPG/WEBP up to 5 MB uploads; over 5 MB is rejected inline and the current hero stays.
- Missing constraint: the spec has no rule that the app hero cap, the bucket cap and `brandingBucketOptions()` agree, no hero-image criterion in BC-3, and BC-8 only documents the logo.
- Spec update: `docs/specs/branding-cms.md` — BC-1/BC-9 bucket 5 MB, BC-3 hero criterion (5 MB + inline error + current hero kept), BC-8 notes 8mb covers a 5 MB hero.

## Spec

- Source: extend existing `docs/specs/branding-cms.md`.
- Summary: bucket limit 5242880 via a new dated migration; `MAX_HERO_BYTES` 5 MB; `heroTooLarge` and hero helper copy say 5 MB in every locale; migration, `MAX_HERO_BYTES` and `brandingBucketOptions().fileSizeLimit` are pinned equal by a test; the hero editor shows an inline, accessible error for an over-limit file without uploading and without replacing the current hero; uploading state disables controls and exposes `aria-busy`. Logo cap (2 MB), MIME types, super_admin gate and the 8mb body limit are unchanged.
- Clarifications needed: none. Non-blocking note: `next.config.mjs` already has `bodySizeLimit: "8mb"`; only comments change (allowed by the brief).

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                   | Risk | Layer | Test file                                            | New or existing                                                                             | Test name                                                                         | Assertion                                                                                                                                                                                                    | Command                                                             | Depends on |
| --- | ----------------------------------------------------------------------------------------------------------- | ---- | ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------- |
| C1  | Hero cap is 5 MB: accept 5242880, reject 5242881 (BC-3)                                                     | P1   | unit  | `tests/unit/branding/validation.test.ts`             | existing file, new test + title renames                                                     | hero upload cap is 5 MB (5242880 accepted, 5242881 rejected)                      | `MAX_HERO_BYTES === 5242880`; `validateHeroUpload` null at 5242880 and `errors.branding.heroTooLarge` at 5242881                                                                                             | `pnpm test:unit tests/unit/branding/validation.test.ts`             | none       |
| C3  | Dated migration = `MAX_HERO_BYTES` = `brandingBucketOptions().fileSizeLimit` = 5242880 (BC-1/BC-9)          | P0   | unit  | `tests/unit/branding/schema.test.ts`                 | existing file, new test                                                                     | branding bucket limit: migration, MAX_HERO_BYTES and bucket options agree at 5 MB | `*_branding_bucket_hero_5mb.sql` exists, last migration touching `branding` `file_size_limit` is 5242880, equals `MAX_HERO_BYTES` and `brandingBucketOptions().fileSizeLimit`                                | `pnpm test:unit tests/unit/branding/schema.test.ts`                 | C1         |
| C2  | 5 MB copy in every locale: `heroTooLarge` and `heroDescription`; no `4MB`/`4 Mo` left (BC-3)                | P2   | unit  | `tests/unit/branding/message-keys.test.ts`           | existing file, new test                                                                     | hero size copy names 5 MB in every locale and no 4MB remains                      | for en and fr: `errors.branding.heroTooLarge` and `staff.branding.heroDescription` contain 5 MB / 5 Mo and none contain 4                                                                                    | `pnpm test:unit tests/unit/branding/message-keys.test.ts`           | none       |
| C4  | Inline accessible over-limit error before/without upload; current hero kept; cleared by a valid file (BC-3) | P1   | unit  | `tests/unit/branding/hero-editor-over-limit.test.ts` | new (happy-dom + `react-dom/client`, per `tests/unit/reservations/date-navigation.test.ts`) | hero editor rejects a just-over-5MB file inline and keeps the current hero        | error text names 5 MB in an `aria-live="polite"`/`role="alert"` region; input `aria-invalid="true"` + `aria-describedby`; `uploadRestaurantHeroImage` not called; preview not replaced; valid file clears it | `pnpm test:unit tests/unit/branding/hero-editor-over-limit.test.ts` | C1, C2     |
| C5  | Uploading state: Save and picker disabled, `aria-busy`, no double submit (brief Visual acceptance)          | P2   | unit  | `tests/unit/branding/hero-editor-over-limit.test.ts` | same new file, second test                                                                  | hero editor disables controls and exposes aria-busy while uploading               | after clicking Save with a pending action: Save, picker button and file input disabled; `aria-busy="true"` on the editor; action called once                                                                 | `pnpm test:unit tests/unit/branding/hero-editor-over-limit.test.ts` | C4         |

Order: C1, C3, C2, C4, C5. C1 (the cap constant) goes before the P0 migration pin so C1's Red is not pre-empted by C3's Green, and C2 (copy) goes before C4 (inline error reads that copy) so C4's Red/Green exit does not depend on an unshipped message. BC-8 (8mb covers 5 MB) is already pinned by `schema.test.ts` ("raises the Server Action body limit…") and `validation.test.ts` ("hero upload body size"); only their titles and the `next.config.mjs` / `lib/branding.ts` comments change, so BC-8 has no new automatable criterion beyond the spec text.

## Traceability Matrix

| Criterion | Spec ref   | Test file::name                                                        | Source file(s)                                                             | Risk | Status  |
| --------- | ---------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---- | ------- |
| C1        | BC-3       | `tests/unit/branding/validation.test.ts`::hero upload cap is 5 MB …    | `lib/branding.ts`                                                          | P1   | planned |
| C3        | BC-1, BC-9 | `tests/unit/branding/schema.test.ts`::branding bucket limit …          | `supabase/migrations/<ts>_branding_bucket_hero_5mb.sql`, `lib/branding.ts` | P0   | planned |
| C2        | BC-3       | `tests/unit/branding/message-keys.test.ts`::hero size copy …           | `messages/en.json`, `messages/fr.json`                                     | P2   | planned |
| C4        | BC-3       | `tests/unit/branding/hero-editor-over-limit.test.ts`::rejects … inline | `components/staff/restaurant-hero-image-editor.tsx`                        | P1   | planned |
| C5        | BC-3       | `tests/unit/branding/hero-editor-over-limit.test.ts`::disables … busy  | `components/staff/restaurant-hero-image-editor.tsx`                        | P2   | planned |

## Execution Preconditions

- Infra needed: none (all unit / mocked). No local Supabase, no e2e.
- The migration is **not** applied to any Supabase project by this run. `supabase.migrations` is `validate-only` in `.cursor/harness.json`; `.github/workflows/staging-migrations.yml` validates it on the PR and `supabase db push --project-ref tilcqrudqxznnpepxjqq` (shared preview/dev) applies it when the PR merges into `staging`. Production is never touched.

## Permissions Requested (before execution)

- Spec edit: `docs/specs/branding-cms.md` — BC-1, BC-3, BC-8, BC-9 (Ready brief step 6; Jose's 10 Oct decision).
- Existing-test edits (brief allows `tests/` edits; the 4 MB literals go red once the cap moves, so they must follow the spec): `tests/unit/branding/actions.test.ts` (two `fileSizeLimit: 4 * 1024 * 1024` expectations and the "hero: 4MB" comment), `tests/unit/branding/validation.test.ts` (titles "4MB" → "5MB", "documents an 8mb … for a 4MB base64 payload"), `tests/unit/branding/schema.test.ts` (title "4MB hero photo").
- New migration (not an existing-migration edit): `supabase/migrations/<ts>_branding_bucket_hero_5mb.sql`. Existing migrations are not edited, per the brief.
- Source: `lib/branding.ts`, `next.config.mjs` (comments only), `components/staff/restaurant-hero-image-editor.tsx`, `messages/en.json`, `messages/fr.json`, `app/admin/settings/page.tsx` only if the helper text needs it.

## TDD Execution Loop

### Criterion C1 — hero cap is 5 MB (layer: unit)

- **Red** → Invoke `tdd-red` to add one test to `tests/unit/branding/validation.test.ts` pinning literal `5242880` accepted, `5242881` rejected with `errors.branding.heroTooLarge`, and `MAX_HERO_BYTES === 5242880`; also apply the listed title renames and the `actions.test.ts` 4 MB literals to 5 MB. Must fail on today's code (cap is 4194304, so 5242880 is rejected); it must execute.
- **Green** → Invoke `tdd-green` to set `MAX_HERO_BYTES` to `5 * 1024 * 1024` in `lib/branding.ts` and align the 4 MB comments in `lib/branding.ts` and `next.config.mjs` (comments only there). Exit = target test green (executed), and the two renamed/updated bucket-option expectations in `actions.test.ts` green.
- **Refactor** → Invoke `tdd-refactor` to re-verify C1 and the `tests/unit/branding` suite, lint, typecheck, prettier on touched files.

### Criterion C3 — migration, MAX_HERO_BYTES and bucket options agree at 5 MB (layer: unit)

- **Red** → Invoke `tdd-red` to add one test to `tests/unit/branding/schema.test.ts` asserting the dated `*_branding_bucket_hero_5mb.sql` migration exists, the last migration that sets the `branding` bucket `file_size_limit` sets 5242880, and that value equals `MAX_HERO_BYTES` and `brandingBucketOptions().fileSizeLimit` (and `allowed_mime_types` is not changed by the new file). It must fail on today's code (limit 2097152, no file); it must execute.
- **Green** → Invoke `tdd-green` to add `supabase/migrations/<ts>_branding_bucket_hero_5mb.sql` (`UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = 'branding'`, idempotent, no MIME change) only. `MAX_HERO_BYTES` is already 5 MB from C1. Exit = target test green (executed), typecheck clean.
- **Refactor** → Invoke `tdd-refactor` to clean up C3, run the whole `tests/unit/branding` suite plus lint, typecheck and prettier --check on touched files. Exit = green (executed).

### Criterion C2 — 5 MB copy in every locale (layer: unit)

- **Red** → Invoke `tdd-red` to add one test to `tests/unit/branding/message-keys.test.ts` asserting `errors.branding.heroTooLarge` and `staff.branding.heroDescription` name 5 MB (en) / 5 Mo (fr) and no `4MB` / `4 Mo` remains in hero copy; en error is "This image is larger than 5 MB. Choose a smaller file.". Must fail on current copy.
- **Green** → Invoke `tdd-green` to update `messages/en.json` and `messages/fr.json` (helper text "PNG, JPG or WEBP, up to 5 MB."). Exit = green (executed).
- **Refactor** → Invoke `tdd-refactor` to re-verify C2 and the branding suite, lint, typecheck, prettier.

### Criterion C4 — inline accessible over-limit error, current hero kept (layer: unit)

- **Red** → Invoke `tdd-red` to create `tests/unit/branding/hero-editor-over-limit.test.ts` (`// @vitest-environment happy-dom`, `react-dom/client` + `act`, `NextIntlClientProvider` with `messages/en.json`, `uploadRestaurantHeroImage` mocked) with one test: pick a file of `MAX_HERO_BYTES + 1`, expect the inline error naming 5 MB in a live region linked by `aria-describedby`, `aria-invalid="true"` on the input, no upload call, no replaced preview, error cleared after a valid file. Must fail for the right reason (the editor has no client-side size check).
- **Green** → Invoke `tdd-green` to add the client-side size check and accessible inline error to `components/staff/restaurant-hero-image-editor.tsx`, reusing `validateHeroUpload`/`MAX_HERO_BYTES` and existing tokens. Exit = target green, typecheck clean.
- **Refactor** → Invoke `tdd-refactor` to clean up C4 and re-run the branding suite, lint, typecheck, prettier on touched files.

### Criterion C5 — uploading state (layer: unit)

- **Red** → Invoke `tdd-red` to add a second test to `tests/unit/branding/hero-editor-over-limit.test.ts`: with `uploadRestaurantHeroImage` pending, after clicking Save the Save button, the picker button and the file input are disabled, the editor exposes `aria-busy="true"`, and a second click does not call the action again. Must fail for the right reason.
- **Green** → Invoke `tdd-green` to disable the picker/input while saving and expose `aria-busy` in `components/staff/restaurant-hero-image-editor.tsx`. Exit = green.
- **Refactor** → Invoke `tdd-refactor` to re-verify the branding suite, lint, typecheck, prettier.

## Manual-UAT (deferred, not automated)

- QA UAT at 390px and desktop with labelled files (just over 5 MB, just under 5 MB, about 3 MB), reload persistence and homepage display, and the live bucket value after the staging migration applies. These need the real preview/dev project and a browser; they are QA-owned in the brief and are not faked as Vitest.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-117_hero_5mb_3e22`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-117_hero_5mb_3e22.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/branding-cms.md`
Criteria: 5 automatable · 0 manual-UAT in the loop (UAT at 390px/desktop is QA-owned)
Approval gates: spec edit `docs/specs/branding-cms.md` (Ready brief + Jose's 10 Oct decision) | existing-test edits in `tests/unit/branding/{validation,schema,actions}.test.ts`
Infra: none (all unit); the migration is applied to the shared preview/dev project only by the staging-migrations workflow on merge, never by this run and never to production
Full plan: not posted to Linear (size-bounded digest) · local copy `res-117_hero_5mb_3e22.plan.md`

Problem: Hero images between 2 and 4 MB pass the app check (`MAX_HERO_BYTES` 4 MB) but the `branding` bucket is limited to 2 MB, so storage rejects them and the editor shows the generic upload error. The spec had no rule that the app cap, bucket cap and `brandingBucketOptions()` agree, nor an inline over-limit error.
Approach: A new dated migration raises the bucket to 5 MB; `MAX_HERO_BYTES`, copy and `brandingBucketOptions()` move to 5 MB and are pinned equal to the migration; the editor rejects over-limit files inline (accessible, current hero kept). Logo cap, MIME types, super_admin gate and the 8mb body limit stay.
Out-of-scope findings: none

| #   | Criterion                                         | Risk | Layer | Test file                                          |
| --- | ------------------------------------------------- | ---- | ----- | -------------------------------------------------- |
| C1  | Hero cap is 5 MB (accept 5242880, reject +1)      | P1   | unit  | tests/unit/branding/validation.test.ts             |
| C3  | Dated migration = MAX_HERO_BYTES = bucket options | P0   | unit  | tests/unit/branding/schema.test.ts                 |
| C2  | 5 MB copy in every locale                         | P2   | unit  | tests/unit/branding/message-keys.test.ts           |
| C4  | Inline accessible over-limit error, hero kept     | P1   | unit  | tests/unit/branding/hero-editor-over-limit.test.ts |
| C5  | Uploading state: disabled controls + aria-busy    | P2   | unit  | tests/unit/branding/hero-editor-over-limit.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings` (Cloud: list findings in the report and PR body; no `docs/findings/**` writes), `4b-linear` (FIX), `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-117_hero_5mb_3e22
- spec: docs/specs/branding-cms.md
- mode: FIX
- linear_issue: RES-117
- criteria_shipped: [C1, C2, C3, C4, C5]
- criteria_manual_uat: none
- req_ids: [BC-1, BC-3, BC-8, BC-9]
- source_paths: [lib/branding.ts, next.config.mjs, components/staff/restaurant-hero-image-editor.tsx, messages/en.json, messages/fr.json, supabase/migrations/<ts>_branding_bucket_hero_5mb.sql]
- test_paths: [tests/unit/branding/schema.test.ts, tests/unit/branding/validation.test.ts, tests/unit/branding/actions.test.ts, tests/unit/branding/message-keys.test.ts, tests/unit/branding/hero-editor-over-limit.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-117_hero_5mb_3e22.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger)

none at planning time. Findings raised by phases are reported in the final report and PR body (Cloud cannot write `docs/findings/<category>.md`).

## Linear Close-out & Findings Registration

- START: `linear-resolver` posts the digest above as the single `Work started:` comment on RES-117 (`run_in_background: true`; no state write).
- Close-out (FIX): `linear-resolver` posts the resolution comment only (no state write).
- Findings: Cloud close-out is attach-only; anything left over is listed in the report.

## First Execution Action

Arm the guard (`node .cursor/hooks/tdd-guard.mjs on`), register criteria with START, launch the `linear-resolver` START Task in the background, apply the spec edit to `docs/specs/branding-cms.md`, then set phase `red` and delegate C3 Red to `tdd-red`.

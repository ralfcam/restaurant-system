# TDD verifier report — res-117_hero_5mb_3e22

FIX run. Linear: [RES-117](https://linear.app/realized/issue/RES-117/homepage-hero-image-upload-fails-in-branding-settings). Owning spec: `docs/specs/branding-cms.md` (BC-1, BC-3, BC-8, BC-9).

This file is a **reading guide for `/commit`**, not a verdict. Order of criteria is C1, C3, C2, C4, C5 (see the work-order `.cursor/plans/res-117_hero_5mb_3e22.plan.md`).

## Criterion close-outs (incremental)

### C1 — hero cap is 5 MB

Suggested review order:

- Hero byte cap (BC-3): `lib/branding.ts:9` [public-api], `lib/branding.ts:154`, `tests/unit/branding/validation.test.ts:145`
- Bucket options follow the cap (BC-9, app side; migration is C3): `lib/branding.ts:195` [schema], `tests/unit/branding/actions.test.ts:143`, `tests/unit/branding/actions.test.ts:335`
- Body-limit comments only (BC-8; value stays `8mb`): `lib/branding.ts:17`, `next.config.mjs:20`, `tests/unit/branding/schema.test.ts:114`, `tests/unit/branding/validation.test.ts:174`

Reusable pattern: Pin an absolute upload cap with the literal boundary (`5242880` accepted, `5242881` rejected) in addition to `MAX_* + 1` cases, so changing the constant cannot move the contract without failing the test.

### C3 — branding bucket limit agrees at 5 MB (migration, MAX_HERO_BYTES, bucket options)

Suggested review order:

- Forward-only bucket limit (BC-1/BC-9): `supabase/migrations/20261015144000_branding_bucket_hero_5mb.sql:6` [schema], `tests/unit/branding/schema.test.ts:250`
- Last writer pinned to the app cap and bucket options: `tests/unit/branding/schema.test.ts:255`, `tests/unit/branding/schema.test.ts:262` [schema], `tests/unit/branding/schema.test.ts:272`

Reusable pattern: Pin a storage bucket limit by scanning migrations for the last branding `file_size_limit` literal (column-aligned `INSERT` or `UPDATE`) and asserting it equals the app constant, without applying SQL.

### C2 — hero size copy names 5 MB in every locale

Suggested review order:

- Spec-pinned hero error and helper size phrase (BC-3), English exact sentence then French `5 Mo`: `messages/en.json:688` [public-api], `messages/fr.json:688` [public-api], `messages/en.json:492`, `messages/fr.json:492`
- Unit pin (exact English error, French `5 Mo` token, no stale `4 MB` / `4 Mo` under the branding catalogs): `tests/unit/branding/message-keys.test.ts:625`

Reusable pattern: Pin a moved size cap with the exact English spec sentence, a French unit token (`5 Mo`), and a catalog leaf walk that fails on `\b4\s?(MB|Mo)\b` under `staff.branding` and `errors.branding`.

### C4 — inline accessible over-limit error keeps the current hero

Suggested review order:

- Size gate before preview or upload (BC-3): `components/staff/restaurant-hero-image-editor.tsx:63` [public-api], `components/staff/restaurant-hero-image-editor.tsx:52`
- Accessible error wiring (`aria-invalid`, `aria-describedby`, always-mounted live region): `components/staff/restaurant-hero-image-editor.tsx:160`, `components/staff/restaurant-hero-image-editor.tsx:183`
- Behavior test (just-over-3MB rejected, no upload, hero kept, valid file clears): `tests/unit/branding/hero-editor-over-limit.test.ts:148`

Reusable pattern: Mount an empty `aria-live="polite"` node up front (`sr-only` while empty so a parent `flex gap-*` reserves no space) and write the message into that same node; drive happy-dom component tests with `react-dom/client` and a faked `File.size` instead of allocating bytes.

### C5 — uploading state disables controls and exposes `aria-busy`

Suggested review order:

- Re-entry guard and busy root (BC-3): `components/staff/restaurant-hero-image-editor.tsx:75`, `components/staff/restaurant-hero-image-editor.tsx:124`
- Picker, file input and Remove disabled while saving: `components/staff/restaurant-hero-image-editor.tsx:159` [auth], `components/staff/restaurant-hero-image-editor.tsx:168` [auth], `components/staff/restaurant-hero-image-editor.tsx:202` [auth]
- Behavior test (pending upload, `aria-busy`, disabled controls, single action call): `tests/unit/branding/hero-editor-uploading.test.ts:146`

Reusable pattern: `tests/unit/branding/super-admin-chrome.test.ts` (SA-10) requires the literal `!isSuperAdmin` inside every mutation control's `disabled={}`, so a shared disable const is not an option without changing that test.

### C6 — hero cap is 3 MB everywhere (fix round 1; supersedes the 5 MB values in C1, C2, C3)

Jose decided on 15 Oct to cap the hero at 3 MB (3145728) because a 5 MiB base64 body exceeds Vercel's 4.5 MB Function request-body limit. The migration file name keeps the `_hero_5mb` suffix from the ticket brief; the limit it sets is 3145728.

Suggested review order:

- Forward-only bucket limit and the app cap agree: `supabase/migrations/20261015144000_branding_bucket_hero_5mb.sql:7` [schema], `lib/branding.ts:9` [public-api], `lib/branding.ts:193`, `tests/unit/branding/schema.test.ts:233`
- Boundary pin (3145728 accepted, 3145729 rejected): `tests/unit/branding/validation.test.ts:145`
- Copy in both locales: `messages/en.json:688`, `messages/fr.json:688`, `messages/en.json:492`, `messages/fr.json:492`, `tests/unit/branding/message-keys.test.ts:625`
- Body limit stays `8mb` (3 MB hero is about 4.2 MB base64): `tests/unit/branding/validation.test.ts:174`, `next.config.mjs:26`

Reusable pattern: When a cap moves, update the literal boundary pins and the stale-copy regex together (the catalog walk now fails on 4 MB and 5 MB under the branding keys), so an older value cannot return through copy.

### C7 — over-limit pick discards a previously chosen valid file (fix round 1)

Suggested review order:

- Over-limit branch resets the picker before showing the error: `components/staff/restaurant-hero-image-editor.tsx:63` [public-api], `components/staff/restaurant-hero-image-editor.tsx:52`
- Behavior test (valid then oversized: Save disabled, preview gone, current hero back, no upload, object URL revoked): `tests/unit/branding/hero-editor-over-limit.test.ts:198`

Reusable pattern: One reset function owns every piece of picker state (file, preview, object URL, native input value), and error branches call it first instead of clearing fields one by one.

## Suggested Review Order (collated)

Highest-risk first.

1. **Storage bucket limit migration [schema]** — `supabase/migrations/20261015144000_branding_bucket_hero_5mb.sql:7` forward-only `UPDATE` to 3145728; `tests/unit/branding/schema.test.ts:233` pins migration, `MAX_HERO_BYTES` and `brandingBucketOptions()` equal at 3145728.
2. **Hero byte cap [public-api]** — `lib/branding.ts:9` `MAX_HERO_BYTES`; `tests/unit/branding/validation.test.ts:145` boundary test (3145728 accepted, 3145729 rejected).
3. **Super-admin-only upload controls [auth]** — `components/staff/restaurant-hero-image-editor.tsx:159`, `:168`, `:202`, `:75` keep the `!isSuperAdmin` gate and add the saving lock.
4. **Inline over-limit error and staged-file discard [public-api]** — `components/staff/restaurant-hero-image-editor.tsx:63` size gate with `resetPicker()`, `:160` `aria-invalid` / `aria-describedby`, `:183` live region; `tests/unit/branding/hero-editor-over-limit.test.ts:148` and `:198`.
5. **Copy and spec** — `messages/en.json:688`, `messages/fr.json:688`, `messages/en.json:492`, `messages/fr.json:492`; `docs/specs/branding-cms.md` BC-1, BC-3, BC-8, BC-9.

## Traceability (final)

Run: 2026-10-15 · plan: res-117_hero_5mb_3e22 · issue: RES-117 · fix round 1 raised C6 and C7 (C1, C2, C3 shipped at 5 MB first; C6 moved them to 3 MB)

| Criterion | Spec ref   | Test file::name                                                                                                                  | Source file(s)                                                                       | Risk | Status  |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---- | ------- |
| C1        | BC-3       | `tests/unit/branding/validation.test.ts`::hero upload cap is 3 MB (3145728 accepted, 3145729 rejected)                           | `lib/branding.ts`                                                                    | P1   | shipped |
| C3        | BC-1, BC-9 | `tests/unit/branding/schema.test.ts`::branding bucket limit: dated migration, MAX_HERO_BYTES and bucket options agree at 3 MB    | `supabase/migrations/20261015144000_branding_bucket_hero_5mb.sql`, `lib/branding.ts` | P0   | shipped |
| C2        | BC-3       | `tests/unit/branding/message-keys.test.ts`::hero size copy names 3 MB in every locale                                            | `messages/en.json`, `messages/fr.json`                                               | P2   | shipped |
| C4        | BC-3       | `tests/unit/branding/hero-editor-over-limit.test.ts`::hero editor rejects a just-over-3MB file inline and keeps the current hero | `components/staff/restaurant-hero-image-editor.tsx`                                  | P1   | shipped |
| C5        | BC-3       | `tests/unit/branding/hero-editor-uploading.test.ts`::hero editor shows an uploading state and blocks double submit while saving | `components/staff/restaurant-hero-image-editor.tsx`                                  | P2   | shipped |
| C6        | BC-1, BC-3, BC-8, BC-9 | `tests/unit/branding/validation.test.ts`, `schema.test.ts`, `actions.test.ts`, `message-keys.test.ts`::cap, bucket limit and copy pinned at 3 MB | `lib/branding.ts`, `next.config.mjs`, `supabase/migrations/20261015144000_branding_bucket_hero_5mb.sql`, `messages/en.json`, `messages/fr.json` | P0 | shipped |
| C7        | BC-3       | `tests/unit/branding/hero-editor-over-limit.test.ts`::hero editor discards a previously chosen valid file when a later pick is over the limit | `components/staff/restaurant-hero-image-editor.tsx`                      | P2   | shipped |

**manual-UAT (deferred):** applying the migration to preview/dev (done by `staging-migrations.yml` on merge to staging) and confirming the live bucket `file_size_limit` is 3145728; an end-to-end 3 MB upload on a Vercel preview.

## Run metrics

Run: 2026-10-15 → 2026-10-15 · plan: res-117_hero_5mb_3e22
Criteria: 7 shipped · 0 manual-uat · 7 total
Phases delegated: 21 (7 red, 7 green, 7 refactor; C1-C5 in the first round, C6-C7 in fix round 1)
Back-loops: 1 (CodeRabbit gate Majors and Minor sent the run back for C6 and C7)
BLOCKED events: none
Issues: RES-117

# Plan + TDD log — REAZED-296 chef's-picks service-role write

Issue: [REAZED-296](https://linear.app/realized/issue/REAZED-296/mixed-clients-for-the-same-settings-row)
Mode: FIX
Owning spec: `docs/specs/branding-cms.md` **BC-1**
Plan slug: `reazed-296_chefs_picks_service`

This file is a **reading guide for `/commit`**, not a verdict.

## Acceptance criteria

| # | Criterion | Risk | Layer | Test file | Test name | Command | Depends on |
| - | --------- | ---- | ----- | --------- | --------- | ------- | ---------- |
| C296-1 | `setChefsPicksEnabled` upserts `restaurant_settings` via `createServiceClient` after `requireStaffUser` | P0 | unit | `tests/unit/menu/chefs-picks-enabled.test.ts` | setChefsPicksEnabled upserts restaurant_settings via createServiceClient | `pnpm test:unit tests/unit/menu/chefs-picks-enabled.test.ts` | none |

## Criterion close-outs (incremental)

### C296-1 — settings upsert uses service-role client

Suggested review order:
- Staff-gated settings write **[auth][security]**
  - `app/actions/menu.ts:5` `createServiceClient` import
  - `app/actions/menu.ts:139` `setChefsPicksEnabled` — `requireStaffUser` then bail `"Unauthorized."`
  - `app/actions/menu.ts:145` singleton upsert `{ id: 1, chefs_picks_enabled, updated_at }` via service role
- Cookie client retained for catalog DML (out of scope)
  - `app/actions/menu.ts:3` `createClient` still imported
  - `app/actions/menu.ts:166` `getAllMenuItems` / `upsertMenuItem` / `createMenuItem` / `deleteMenuItem` still `await createClient()`
- Test pin
  - `tests/unit/menu/chefs-picks-enabled.test.ts:45` service upsert called; cookie upsert never called; unauth short-circuits

Reusable pattern: Dual-mock the cookie vs service upsert (`cookieUpsert` / `serviceUpsert`) so a settings-write test asserts the service client ran and the JWT client did not, including the unauth path.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Staff-gated settings write `[auth]` `[security]`

- `app/actions/menu.ts:5` — `createServiceClient` import from `@/lib/supabase/service`
- `app/actions/menu.ts:139` — `setChefsPicksEnabled`: `requireStaffUser` then `{ error: "Unauthorized." }` (SA-8 staff, not super_admin)
- `app/actions/menu.ts:145` — singleton upsert `{ id: 1, chefs_picks_enabled, updated_at }` via service role (BC-1)

### 2. Cookie client retained for catalog DML (out of scope — REAZED-314)

- `app/actions/menu.ts:3` — `createClient` from `@/lib/supabase/server` still imported
- `app/actions/menu.ts:166` — `getAllMenuItems` / `upsertMenuItem` / `createMenuItem` / `deleteMenuItem` / `toggleMenuItemAvailability` still `await createClient()`

### 3. Test pin

- `tests/unit/menu/chefs-picks-enabled.test.ts:45` — staff success: service upsert `{ id: 1, chefs_picks_enabled: true }`; cookie upsert never called; unauth returns `{ error: "Unauthorized." }` and neither upsert runs

## Traceability (final)

Run: 2026-09-03 · plan: reazed-296_chefs_picks_service · issue: REAZED-296

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C296-1 | branding-cms.md BC-1 | chefs-picks-enabled.test.ts::setChefsPicksEnabled upserts restaurant_settings via createServiceClient | `app/actions/menu.ts` `setChefsPicksEnabled` | P0 | shipped |

## Run metrics

Run: 2026-09-03 → 2026-09-03 · plan: reazed-296_chefs_picks_service
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (C296-1 R/G/Rf)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 2 attached-to-existing · 2 left on ledger (below floor) — cap 3/run

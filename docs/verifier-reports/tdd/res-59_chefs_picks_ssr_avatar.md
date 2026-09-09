# TDD log: res-59_chefs_picks_ssr_avatar

## C1

Suggested review order:
- RSC seed / public homepage contract `[public-api]`
  - `app/[locale]/page.tsx:5` — `await params`, `setRequestLocale`, `await getHomepageChefsPicks`
- RSC → client handoff `[public-api]`
  - `app/[locale]/page.tsx:14` — `<HomePageClient initialChefsPicks={…} />`
- Client seed typing without action value-import `[public-api]`
  - `components/site/home-page-client.tsx:1` — `"use client"`
  - `components/site/home-page-client.tsx:23` — type-only `MenuItemRow` + `ChefsPicksPayload`
  - `components/site/home-page-client.tsx:26` — `HomePageClient` props
  - `components/site/home-page-client.tsx:35` — `useChefsPicks(initialChefsPicks)`
- Shared payload type
  - `hooks/use-chefs-picks.ts:6` — `export type ChefsPicksPayload`
- Markup ownership / path retarget
  - `tests/unit/site/homepage-layout.test.ts:6`
  - `tests/unit/site/chefs-picks-types.test.ts:7`
  - `tests/unit/site-header.test.ts:8`
  - `tests/unit/branding/schema.test.ts:208`

Reusable pattern: After an App Router page split, export the SWR/hook payload type so the client never value-imports the server action, and retarget source-read structural tests to the file that owns the JSX (path only).

## C2

Suggested review order:
- `components/site/home-page-client.tsx:244` — visible-character avatar fallback `[ux]` `[public-api]`
- `components/site/home-page-client.tsx:231-232` — localized `name` fed into that expression
- `tests/unit/site/homepage-layout.test.ts:80-99` — HP-3 source pin (`trim` + `??`/`||` + `"?"`)

Reusable pattern: empty/whitespace `str.trim()[0]` is `undefined`, so `?? "?"` is the full visible-character fallback — do not extract a helper.

## Suggested Review Order (collated)

Highest-risk first, grouped by concern.

### [public-api] Homepage RSC seed (HP-2)
- `app/[locale]/page.tsx:5` — async `params`, `setRequestLocale`, `await getHomepageChefsPicks`
- `app/[locale]/page.tsx:14` — `<HomePageClient initialChefsPicks={…} />`
- `components/site/home-page-client.tsx:1` — `"use client"`
- `components/site/home-page-client.tsx:35` — `useChefsPicks(initialChefsPicks)`
- `hooks/use-chefs-picks.ts:6` — `export type ChefsPicksPayload`

### [ux] Featured-dish avatar fallback (HP-3)
- `components/site/home-page-client.tsx:244` — `{name.trim()[0] ?? "?"}`
- `components/site/home-page-client.tsx:231-232` — localized `name`
- `tests/unit/site/homepage-layout.test.ts:80-99` — HP-3 source pin

### Markup ownership (path retarget)
- `tests/unit/site/homepage-layout.test.ts:6`
- `tests/unit/site/chefs-picks-types.test.ts:7`
- `tests/unit/site-header.test.ts:8`
- `tests/unit/branding/schema.test.ts:208`

## Traceability (final)

Run: 2026-09-09 · plan: res-59_chefs_picks_ssr_avatar · issue: RES-59

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | homepage.md HP-2 | home-page-chefs-picks-ssr.test.ts::seeds useChefsPicks with server-fetched getHomepageChefsPicks data | app/[locale]/page.tsx, components/site/home-page-client.tsx, hooks/use-chefs-picks.ts | P2 | shipped |
| C2 | homepage.md HP-3 | homepage-layout.test.ts::featured-dish avatar falls back to a visible character when the localized name is empty | components/site/home-page-client.tsx | P3 | shipped |

## Run metrics

Run: 2026-09-09 → 2026-09-09 · plan: res-59_chefs_picks_ssr_avatar
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 (2 red, 2 green, 2 refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 6 left on ledger (below floor) — cap 3/run; REGISTER skipped (no high/security-med candidates)

# Restaurant-system backlog burndown — 2026-09-02

Live Linear inventory (read-only MCP). Project `restaurant-system`
(`a9ca2bc2-107e-4c56-a62c-5e6659c8a172`). Filter: Backlog + Todo.
In Progress: 0. In Review: 0.

**Pending: 29** (17 Backlog · 12 Todo). Epics are not implemented as
standalone work; children are.

Linear MCP writes are available. REAZED-298 START is posted (In Progress).
Do not write In Review/Done. `/commit` + `/push` remain the automation path
to Done.

## Execution order (re-evaluated)

| # | Issue | State | Linear pri | BMAD | Class | Spec | Spec-edit? | First action |
| - | ----- | ----- | ---------- | ---- | ----- | ---- | ---------- | ------------ |
| 1 | REAZED-298 | Todo | Medium | P0 | security / authz | branding-cms BC-1 | no (BC-1 already requires service-role writes) | TDD now |
| 2 | REAZED-296 | Todo | Medium | P0 | security | branding-cms BC-1 | no | after 298 (cookie `setChefsPicksEnabled` will 42501 once 298 ships) |
| 3 | REAZED-322 | Todo | Medium | P0 | security | PV-9 sibling; service.ts unpinned | **yes** — need `server-only` AC on `lib/supabase/service.ts` | blocked on spec approval |
| 4 | REAZED-273 | Todo | Medium | P0 | security / auth | site-localization / proxy | likely yes (cookie-option merge unstated) | after spec |
| 5 | REAZED-315 | Backlog | Medium | P0 | concurrency | booking-rules BW-10 | likely yes (lock strategy unstated) | after spec |
| 6 | REAZED-313 | Backlog | Medium | P0 | data-integrity | booking-rules blocked dates | no (must block; fail-open is the defect) | after 298 wave |
| 7 | REAZED-323 | Backlog | Medium | P0 | grant hygiene | none named | **yes** | after spec |
| 8 | REAZED-324 | Backlog | Medium | P0 | search_path | none named | **yes** | after spec — code still missing SET search_path on `replace_operating_windows` |
| 9 | REAZED-292 | Todo | Medium | P0 | DEFINER | none named | verify first | tree already has SECURITY DEFINER on `validate_reservation_availability` (baseline + `20260818162000`); likely remote-apply / already-satisfied |
| 10 | REAZED-291 | Todo | Medium | P2 | security | scheduling guest_note | **yes** (cap unstated) | after spec |
| 11 | REAZED-299 | Todo | Medium | P0 | security | **conflict** | **stop** — issue forbids silent OH-PRIV copy; floor JWT DML may be intentional | operator clarification |
| 12 | REAZED-317 | Todo | High | P1 | test-debt / isolation | scheduling §15 sibling | no | unit/integ pin |
| 13 | REAZED-314 | Todo | High | P1 | product-gap | menu-availability AC-2 | no | after 296 pattern |
| 14 | REAZED-325 | Backlog | High | P1 | product-gap | post-visit-review-email | no (PV schema already required) | DDL + cron |
| 15 | REAZED-311 | Todo | High | P1 | product-gap | menu-availability / POS | child of 318 | after 314 |
| 16 | REAZED-312 | Todo | High | P1 | product-gap | orders schema missing | **yes** if no orders spec | after 311 |
| 17 | REAZED-318 | Todo | High | — | epic | — | n/a | closes when 311+312 (+316 already Done) ship |
| 18 | REAZED-295 | Backlog | Medium | — | epic | — | n/a | children 273/284/287/288/289 |
| 19 | REAZED-284 | Backlog | Medium | P2 | test-debt | i18n/session | child of 295 | with 273 |
| 20 | REAZED-287 | Backlog | Low | P3 | test-debt | i18n | child of 295 | later |
| 21 | REAZED-288 | Backlog | Low | P3 | tech-debt | i18n | child of 295 | later |
| 22 | REAZED-289 | Backlog | Low | P3 | test-debt | i18n | child of 295 | later |
| 23 | REAZED-293 | Backlog | Medium | — | epic | site-localization | n/a | children 277/279/282/283/285/286 |
| 24 | REAZED-282 | Backlog | Medium | P2 | product-gap | site-localization | no if locale Link already specified | later |
| 25 | REAZED-277 | Backlog | Medium | P2 | tech-debt | site-localization | likely yes | later |
| 26 | REAZED-279 | Backlog | Medium | P2 | product-gap | homepage / menu | path `app/page.tsx` may be stale (flat route removed) | verify then later |
| 27 | REAZED-283 | Backlog | Low | P3 | ux | site-chrome | later |
| 28 | REAZED-285 | Backlog | Low | P3 | test-debt | site-chrome | later |
| 29 | REAZED-286 | Backlog | Low | P3 | tech-debt | site-chrome | later |

## Blockers / approvals

- **REAZED-299:** issue text says do not blindly copy OH-PRIV onto floor tables. Need operator decision: which tables lose authenticated FOR ALL vs keep JWT DML for POS/floor.
- **Spec-edit required before TDD:** 322, 323, 324, 291, likely 273/315/312/277.
- **REAZED-292:** verify already-satisfied in tree; remote apply may be manual-UAT.
- **MCP writes:** START posted on REAZED-298. CLOSE-OUT comment deferred until C298-3 executes (do not claim the issue resolved).

## Current issue

See `docs/verifier-reports/tdd/reazed-298_settings_priv_1059.md` plan section
and the in-thread Execution Protocol for REAZED-298.

## Findings (this run)

Open residuals go under the category headings below.

## security

(none — C298-5 shipped the dated forward; merged/resolved)

## tech-debt

Merged to `docs/findings/tech-debt.md` (pnpm.overrides).

## test-debt

Merged to `docs/findings/test-debt.md` (C298-5 stamp floor).

## product-gaps

Auth-And-RLS + deploy-runbook gaps resolved by docs-updater. BC-8 4mb vs 8mb merged to `docs/findings/product-gaps.md`.

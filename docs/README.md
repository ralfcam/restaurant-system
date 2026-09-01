# Documentation — restaurant-system

**Status:** Reference  
**Last updated:** 2026-09-01

Hub for specs, architecture, testing guides, and runbooks. The `.cursor` TDD/audit
workflow treats **`docs/specs/`** as the sole acceptance authority.

## Documentation map

| Area                              | Primary doc                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Platform overview                 | [architecture/Platform-Overview.md](./architecture/Platform-Overview.md)                                                        |
| Auth & RLS                        | [architecture/Auth-And-RLS.md](./architecture/Auth-And-RLS.md)                                                                  |
| Staff authorization               | [specs/staff-authorization.md](./specs/staff-authorization.md) · [architecture/Auth-And-RLS.md](./architecture/Auth-And-RLS.md) |
| Reservations / booking            | [specs/booking-rules.md](./specs/booking-rules.md) · [architecture/Reservation-Flow.md](./architecture/Reservation-Flow.md)     |
| Menu / 86 / POS / KDS             | [specs/menu-availability.md](./specs/menu-availability.md) · [architecture/Order-Flow.md](./architecture/Order-Flow.md)         |
| Guest site chrome (header / logo) | [specs/site-chrome.md](./specs/site-chrome.md)                                                                                  |
| Branding CMS (admin-managed logo) | [specs/branding-cms.md](./specs/branding-cms.md)                                                                                |
| Post-visit review email           | [specs/post-visit-review-email.md](./specs/post-visit-review-email.md)                                                          |
| Scheduling / floor                | [specs/scheduling.md](./specs/scheduling.md) · [architecture/Floor-Plan.md](./architecture/Floor-Plan.md)                       |
| Testing pyramid                   | [testing/Pyramid-Overview.md](./testing/Pyramid-Overview.md)                                                                    |
| Unit tests                        | [testing/Vitest-Unit-Guide.md](./testing/Vitest-Unit-Guide.md)                                                                  |
| Integration / RLS                 | [testing/Vitest-Integration-Guide.md](./testing/Vitest-Integration-Guide.md)                                                    |
| E2E                               | [testing/E2E-Playwright-Guide.md](./testing/E2E-Playwright-Guide.md)                                                            |
| Patterns & recipes                | [testing/Design-And-Patterns.md](./testing/Design-And-Patterns.md)                                                              |
| Seeds & fixtures                  | [testing/Test-Data-And-Seeds.md](./testing/Test-Data-And-Seeds.md)                                                              |
| Deploy                            | [runbooks/deploy.md](./runbooks/deploy.md)                                                                                      |
| Product scope                     | [PRD/restaurant-system-PRD.md](./PRD/restaurant-system-PRD.md)                                                                  |
| Open findings (TDD ledger)        | [findings/README.md](./findings/README.md)                                                                                      |
| Audit verifier reports            | [verifier-reports/README.md](./verifier-reports/README.md)                                                                      |

## Ownership (anti-duplication)

| Topic                             | Canonical owner                    | Siblings (summary / links only)                          |
| --------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Acceptance criteria               | `docs/specs/*`                     | Architecture docs summarize; they do not define criteria |
| Reservation booking rules         | `specs/booking-rules.md`           | `architecture/Reservation-Flow.md`                       |
| Menu availability / 86            | `specs/menu-availability.md`       | `architecture/Order-Flow.md`                             |
| Staff scheduling / tables         | `specs/scheduling.md`              | `architecture/Floor-Plan.md`                             |
| Guest header / brand logo         | `specs/site-chrome.md`             | `specs/branding-cms.md` (custom override)                |
| Admin-managed logo / branding CMS | `specs/branding-cms.md`            | `specs/site-chrome.md` (empty-by-default mark)           |
| Post-visit review email           | `specs/post-visit-review-email.md` | `architecture/Reservation-Flow.md` (complete enqueue)    |
| Staff authorization (JWT claim)   | `specs/staff-authorization.md`     | `architecture/Auth-And-RLS.md`                           |
| Test how-to                       | `testing/*-Guide.md`               | `Design-And-Patterns.md` for promoted recipes            |

## Plan → doc traceability

| Plan                                                                          | Shipped    | Docs updated                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared Site Header + 48px Logo                                                | 2026-06-27 | `specs/site-chrome.md`, `specs/README.md`, `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                                                     |
| REAZED-276 single homepage (SC-5)                                             | 2026-06-27 | `specs/site-chrome.md` (SC-5), `testing/Design-And-Patterns.md`; removes flat `app/page.tsx`                                                                                                                                                                                                                                                                    |
| Logo upload reliability (BC-8, BC-9)                                          | 2026-08-18 | `specs/branding-cms.md`, `architecture/Platform-Overview.md`, `architecture/Auth-And-RLS.md`, `testing/Test-Data-And-Seeds.md`, `testing/Design-And-Patterns.md`, `runbooks/deploy.md`                                                                                                                                                                          |
| Restaurant Link template + empty default logo                                 | 2026-08-18 | `specs/site-chrome.md`, `specs/branding-cms.md`, `PRD/restaurant-system-PRD.md`, `architecture/Platform-Overview.md`, `testing/Design-And-Patterns.md`, `testing/Vitest-Unit-Guide.md`, `runbooks/deploy.md`                                                                                                                                                    |
| G-T1 typecheck fix (`g-t1_typecheck_fix_47606513`)                            | 2026-08-25 | `specs/dev-toolchain.md` (G-T1 C1–C3 trace), `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                                                   |
| G-T1 ignoreBuildErrors (`reazed-278_ignorebuilderrors_7ba76e17`)              | 2026-08-28 | `specs/dev-toolchain.md` (G-T1 C4 trace), `testing/Design-And-Patterns.md`, `runbooks/deploy.md`                                                                                                                                                                                                                                                                |
| G-L1 temp ignore (`g-l1_temp_ignore_da077232`)                                | 2026-08-25 | `specs/dev-toolchain.md` (G-L1 C1 trace), `specs/README.md`, `testing/Design-And-Patterns.md`, `runbooks/deploy.md`                                                                                                                                                                                                                                             |
| G-L1 max-warnings (`reazed-272_lint_max_warnings`)                            | 2026-08-25 | `specs/dev-toolchain.md` (G-L1 C2 trace), `testing/Design-And-Patterns.md`, `runbooks/deploy.md`                                                                                                                                                                                                                                                                |
| G-L1 unused-disable (`reazed-274_lint_disable_directive_e91a4bc7`)            | 2026-09-01 | `specs/dev-toolchain.md` (G-L1 C3 trace), `specs/README.md`, `testing/Design-And-Patterns.md`, `runbooks/deploy.md`                                                                                                                                                                                                                                             |
| G-F1 Prettier (`g-f1_prettier_repo_tool`)                                     | 2026-08-25 | `specs/dev-toolchain.md` (G-F1), `specs/README.md`, `testing/Pyramid-Overview.md`, `testing/Design-And-Patterns.md`, `runbooks/deploy.md`                                                                                                                                                                                                                       |
| OH-SAVE isolation + complete-replace pin (`pr35_coderabbit_oh_save`)          | 2026-08-25 | `specs/scheduling.md` (§15, by orchestrator), `runbooks/deploy.md`, `testing/Vitest-Integration-Guide.md`, `testing/Design-And-Patterns.md`, `findings/test-debt.md`                                                                                                                                                                                            |
| OH-PRIV hours privilege (`reazed-290_hours_privilege`)                        | 2026-08-25 | `specs/scheduling.md` (§16 trace), `architecture/Auth-And-RLS.md`, `runbooks/deploy.md`, `testing/Design-And-Patterns.md`, `testing/Vitest-Integration-Guide.md`, `testing/Test-Data-And-Seeds.md`                                                                                                                                                              |
| OH-PRIV service_role GRANT (`reazed-297_service-role_grant_5bde11c5`)         | 2026-08-25 | `specs/scheduling.md` (§16 trace), `architecture/Auth-And-RLS.md`, `runbooks/deploy.md`, `testing/Design-And-Patterns.md`, `testing/Test-Data-And-Seeds.md`                                                                                                                                                                                                     |
| EARLY-PRIV sibling GRANT (`reazed-297_sibling_grants_097b94f3`)               | 2026-08-27 | `specs/scheduling.md` (§17 trace), `architecture/Auth-And-RLS.md`, `runbooks/deploy.md`, `testing/Design-And-Patterns.md`, `testing/Test-Data-And-Seeds.md`                                                                                                                                                                                                     |
| RES-PRIV / PUBLIC-READ-PRIV (`reazed-308_privileges_be131e14`)                | 2026-08-27 | `specs/booking-rules.md` (AC-5 trace), `specs/scheduling.md` (§18 trace), `specs/menu-availability.md` (AC-2 trace), `architecture/Auth-And-RLS.md`, `runbooks/deploy.md`, `testing/Design-And-Patterns.md`, `testing/Test-Data-And-Seeds.md`                                                                                                                   |
| REAZED-309 occupancy buffer (`reazed-309_occupancy_buffer_1862f023`)          | 2026-08-27 | `specs/booking-rules.md` (BW-9–BW-11), `specs/scheduling.md` (FP-10), `architecture/Reservation-Flow.md`, `architecture/Floor-Plan.md`, `architecture/Auth-And-RLS.md`, `runbooks/deploy.md`, `testing/Design-And-Patterns.md`, `testing/Vitest-Integration-Guide.md`, `testing/Test-Data-And-Seeds.md`                                                         |
| REAZED-306 live occupancy (`reazed-306_live_occupancy_44f250a2`)              | 2026-08-28 | `specs/scheduling.md` (FP-11 trace), `architecture/Floor-Plan.md`, `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                             |
| REAZED-316 POS table picker (`reazed-316_pos_table_picker_28440958`)          | 2026-09-01 | `specs/scheduling.md` (FP-13 trace), `architecture/Floor-Plan.md`, `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                             |
| REAZED-300 staff reservations (`reazed-300-staff-reservations_3fd7b670.plan`) | 2026-08-28 | `specs/scheduling.md` (FP-3/FP-5 ACs, by orchestrator), `specs/booking-rules.md` (STAFF-LIST AC, by orchestrator), `testing/Design-And-Patterns.md`                                                                                                                                                                                                             |
| REAZED-304 floor select blur (`reazed-304_floor_blur_320155e0`)               | 2026-08-28 | `specs/scheduling.md` (FP-12 trace), `architecture/Floor-Plan.md`, `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                             |
| REAZED-305 table-fit (`reazed-305_table-fit_ebc5d205`)                        | 2026-08-28 | `specs/booking-rules.md` (BW-12), `specs/scheduling.md` (FP-3/FP-10), `architecture/Reservation-Flow.md`, `architecture/Auth-And-RLS.md`, `runbooks/deploy.md`, `testing/Design-And-Patterns.md`, `testing/Vitest-Integration-Guide.md`, `testing/Test-Data-And-Seeds.md`                                                                                       |
| Vercel git-link + hosted env (`vercel_env_via_cli_8a5a7c45`)                  | 2026-08-27 | `runbooks/deploy.md`, `architecture/Platform-Overview.md`, repo-root `README.md`                                                                                                                                                                                                                                                                                |
| OH-SAVE hermetic unit pin (`oh-save_pin_hermetic_2088c96a`)                   | 2026-08-28 | `specs/scheduling.md` (§15 AC by orchestrator; Implementation trace), `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                          |
| Post-visit review email (`post-visit_review_tdd_ac1962e1`)                    | 2026-08-30 | `specs/post-visit-review-email.md`, `specs/README.md`, `testing/Design-And-Patterns.md`, `testing/Vitest-Unit-Guide.md`, `testing/Vitest-Integration-Guide.md`, `testing/Test-Data-And-Seeds.md`, `runbooks/deploy.md`, `architecture/Platform-Overview.md`, `architecture/Auth-And-RLS.md`, `architecture/Reservation-Flow.md`, `PRD/restaurant-system-PRD.md` |
| REAZED-310 staff authorization (`reazed-310_staff_auth_a6b9be91.plan`)        | 2026-08-30 | `specs/staff-authorization.md` (SA-1–SA-6, by orchestrator), `specs/README.md`, `architecture/Auth-And-RLS.md`, `architecture/Platform-Overview.md`, `testing/Design-And-Patterns.md`, `testing/Vitest-Unit-Guide.md`, `testing/Test-Data-And-Seeds.md`, `runbooks/deploy.md`                                                                                   |
| Mailing automations triple (`mailing_automations_triple_2347e1d5.plan`)       | 2026-08-30 | `testing/Design-And-Patterns.md` (PV-6 claim-before-send, PV-9 `server-only`, BW-13/BW-14), `architecture/Reservation-Flow.md`, `dev-journal.md`                                                                                                                                                                                                                |
| REAZED-280 POS/KDS locale scope (`reazed-280_pos_kds_locale_scope_4d8f1c92`)  | 2026-09-01 | `specs/site-localization.md` (AC-3 trace), `architecture/Platform-Overview.md`, `testing/Design-And-Patterns.md`                                                                                                                                                                                                                                                |

## Seed path

Configured in `supabase/config.toml`:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

Reference data: `supabase/seed.sql` (`restaurant_settings`, `operating_windows`,
`menu_items`). Schema:
`supabase/migrations/00000000000000_baseline.sql`. Details in
[testing/Test-Data-And-Seeds.md](./testing/Test-Data-And-Seeds.md) and
[runbooks/deploy.md](./runbooks/deploy.md).

## Dev journal

See [dev-journal.md](./dev-journal.md).

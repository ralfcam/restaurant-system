# Documentation — restaurant-system

**Status:** Reference  
**Last updated:** 2026-06-27

Hub for specs, architecture, testing guides, and runbooks. The `.cursor` TDD/audit
workflow treats **`docs/specs/`** as the sole acceptance authority.

## Documentation map

| Area | Primary doc |
| --- | --- |
| Platform overview | [architecture/Platform-Overview.md](./architecture/Platform-Overview.md) |
| Auth & RLS | [architecture/Auth-And-RLS.md](./architecture/Auth-And-RLS.md) |
| Reservations / booking | [specs/booking-rules.md](./specs/booking-rules.md) · [architecture/Reservation-Flow.md](./architecture/Reservation-Flow.md) |
| Menu / 86 / POS / KDS | [specs/menu-availability.md](./specs/menu-availability.md) · [architecture/Order-Flow.md](./architecture/Order-Flow.md) |
| Guest site chrome (header / logo) | [specs/site-chrome.md](./specs/site-chrome.md) |
| Scheduling / floor | [specs/scheduling.md](./specs/scheduling.md) · [architecture/Floor-Plan.md](./architecture/Floor-Plan.md) |
| Testing pyramid | [testing/Pyramid-Overview.md](./testing/Pyramid-Overview.md) |
| Unit tests | [testing/Vitest-Unit-Guide.md](./testing/Vitest-Unit-Guide.md) |
| Integration / RLS | [testing/Vitest-Integration-Guide.md](./testing/Vitest-Integration-Guide.md) |
| E2E | [testing/E2E-Playwright-Guide.md](./testing/E2E-Playwright-Guide.md) |
| Patterns & recipes | [testing/Design-And-Patterns.md](./testing/Design-And-Patterns.md) |
| Seeds & fixtures | [testing/Test-Data-And-Seeds.md](./testing/Test-Data-And-Seeds.md) |
| Deploy | [runbooks/deploy.md](./runbooks/deploy.md) |
| Product scope | [PRD/restaurant-system-PRD.md](./PRD/restaurant-system-PRD.md) |
| Open findings (TDD ledger) | [findings/README.md](./findings/README.md) |
| Audit verifier reports | [verifier-reports/README.md](./verifier-reports/README.md) |

## Ownership (anti-duplication)

| Topic | Canonical owner | Siblings (summary / links only) |
| --- | --- | --- |
| Acceptance criteria | `docs/specs/*` | Architecture docs summarize; they do not define criteria |
| Reservation booking rules | `specs/booking-rules.md` | `architecture/Reservation-Flow.md` |
| Menu availability / 86 | `specs/menu-availability.md` | `architecture/Order-Flow.md` |
| Staff scheduling / tables | `specs/scheduling.md` | `architecture/Floor-Plan.md` |
| Guest header / brand logo | `specs/site-chrome.md` | — |
| Test how-to | `testing/*-Guide.md` | `Design-And-Patterns.md` for promoted recipes |

## Plan → doc traceability

| Plan | Shipped | Docs updated |
| --- | --- | --- |
| Shared Site Header + 48px Logo | 2026-06-27 | `specs/site-chrome.md`, `specs/README.md`, `testing/Design-And-Patterns.md` |
| REAZED-276 single homepage (SC-5) | 2026-06-27 | `specs/site-chrome.md` (SC-5), `testing/Design-And-Patterns.md`; removes flat `app/page.tsx` |

## Seed path

Configured in `supabase/config.toml`:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

Reference data: `supabase/seed.sql` (`operating_windows`, `menu_items`). Schema:
`supabase/migrations/00000000000000_baseline.sql`. Details in
[testing/Test-Data-And-Seeds.md](./testing/Test-Data-And-Seeds.md) and
[runbooks/deploy.md](./runbooks/deploy.md).

## Dev journal

See [dev-journal.md](./dev-journal.md).

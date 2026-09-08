# Findings run: res-61_guest_i18n_followups

Open leftover items deferred from RES-61 (not later criteria in this plan).

## security

(none)

## tech-debt

(none — LanguageSwitcher variant vs scroll already on `docs/findings/tech-debt.md`)

## test-debt

- [ ] Source-level `href="/admin"` does not prove AC-8 at runtime · `tests/unit/i18n/site-header-locale-nav.test.ts` / `components/site/site-header.tsx` · If Green wires staff login through next-intl `Link`, an EN visitor can still land on `/en/admin`; homepage already aliases `NextLink` for the footer staff console · med · (found: tdd/res-61_guest_i18n_followups/C1/red)
- [ ] Homepage footer staff console has no AC-8 guard · `app/[locale]/page.tsx` footer `/admin` · Same must-stay-unprefixed rule as the header; C2–C7 do not add a test for this surface · low · (found: tdd/res-61_guest_i18n_followups/C1/red)

## product-gaps

- [ ] Reservation-widget toasts/errors still English · `components/site/reservation-widget.tsx` (`Time slot unavailable`, `Reservation confirmed`, `Select a date`) · Spec chrome keys do not include submit/error copy; EN guest on `/` still sees English toasts · med · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/plan)

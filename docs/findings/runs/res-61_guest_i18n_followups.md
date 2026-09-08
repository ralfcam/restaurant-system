# Findings run: res-61_guest_i18n_followups

Open leftover items deferred from RES-61 (not later criteria in this plan).

## security

(none)

## tech-debt

- [ ] Header-visibility helper ignores locale-prefixed admin · `lib/site-chrome.ts:18` · `!pathname.startsWith("/admin")` would still show the guest header on `/en/admin` if staff login were ever wired through next-intl `Link` · low · (found: tdd/res-61_guest_i18n_followups/C1/refactor)

## test-debt

- [ ] C1 source test does not lock staff login to unprefixed `next/link` · `tests/unit/i18n/site-header-locale-nav.test.ts:27` · `href="/admin"` still matches if those buttons use next-intl `Link`, which would render `/en/admin` on English routes (AC-8); Green used `NextLink` but the assertion does not pin the import · med · (found: tdd/res-61_guest_i18n_followups/C1/green)
- [ ] Homepage footer staff console has no AC-8 guard · `app/[locale]/page.tsx` footer `/admin` · Same must-stay-unprefixed rule as the header; C2–C7 do not add a test for this surface · low · (found: tdd/res-61_guest_i18n_followups/C1/red)
- [ ] AC-12 has no runtime/e2e click proof · `tests/unit/i18n/site-header-locale-nav.test.ts` · source-scan only; an EN visitor Menu → `/en/menu` (and logo/`/#reserve` prefixing) is never executed · med · (found: tdd/res-61_guest_i18n_followups/C1/refactor)
- [ ] C2 pin is existence-only across dual chrome surfaces · `tests/unit/i18n/site-header-chrome.test.ts` · desktop and mobile each hardcode Staff login / Book a table / Menu; one `{t()}` match would leave the other locale-blind, and C3 e2e is desktop · med · (found: tdd/res-61_guest_i18n_followups/C2/red)

## product-gaps

- [ ] Reservation-widget toasts/errors still English · `components/site/reservation-widget.tsx` (`Time slot unavailable`, `Reservation confirmed`, `Select a date`) · Spec chrome keys do not include submit/error copy; EN guest on `/` still sees English toasts · med · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/plan)
- [ ] Unused `nav.staff` catalog key · `messages/en.json` / `messages/fr.json` · `"Staff"` / `"Personnel"` is not in AC-11 and has no caller · low · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/C2/red)

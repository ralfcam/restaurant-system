# Findings run: res-61_guest_i18n_followups

Open leftover items deferred from RES-61 (not later criteria in this plan).

## security

(none)

## tech-debt

- [ ] Header-visibility helper ignores locale-prefixed admin · `lib/site-chrome.ts:18` · `!pathname.startsWith("/admin")` would still show the guest header on `/en/admin` if staff login were ever wired through next-intl `Link` · low · (found: tdd/res-61_guest_i18n_followups/C1/refactor)
- [ ] Guest e2e cannot boot without Supabase keys · `lib/supabase/proxy.ts:10` · `createServerClient` runs on every request, so public i18n pages (and the navbar e2e) hard-depend on env even when no DB work is needed · med · (found: tdd/res-61_guest_i18n_followups/C3/red)

## test-debt

- [ ] C1 source test does not lock staff login to unprefixed `next/link` · `tests/unit/i18n/site-header-locale-nav.test.ts:27` · `href="/admin"` still matches if those buttons use next-intl `Link`, which would render `/en/admin` on English routes (AC-8); Green used `NextLink` but the assertion does not pin the import · med · (found: tdd/res-61_guest_i18n_followups/C1/green)
- [ ] Homepage footer staff console has no AC-8 guard · `app/[locale]/page.tsx` footer `/admin` · Same must-stay-unprefixed rule as the header; C2–C7 do not add a test for this surface · low · (found: tdd/res-61_guest_i18n_followups/C1/red)
- [ ] AC-12 has no runtime/e2e click proof · `tests/unit/i18n/site-header-locale-nav.test.ts` · source-scan only; an EN visitor Menu → `/en/menu` (and logo/`/#reserve` prefixing) is never executed · med · (found: tdd/res-61_guest_i18n_followups/C1/refactor)
- [ ] C2/C3 pins are desktop-weighted for dual chrome · `tests/unit/i18n/site-header-chrome.test.ts` / `tests/e2e/localization.spec.ts:58-77` · one `{t()}` match or desktop button name would leave a locale-blind mobile sibling green; C3 never opens the sheet · med · (found: tdd/res-61_guest_i18n_followups/C3/refactor)
- [ ] C2 does not pin catalog key presence · `tests/unit/i18n/site-header-chrome.test.ts` · source greps `{t("…")}` only; a missing/typo’d `nav.*` key still passes unit; C3 covers distinguishing FR/EN strings, not `nav.menu` / `nav.openMenu` in both JSON files · low · (found: tdd/res-61_guest_i18n_followups/C2/refactor)
- [ ] AC-11 also distinguishes `Ouvrir le menu` / `Open menu` · `docs/specs/site-localization.md` AC-11 / `nav.openMenu` · C3 e2e and no later criterion assert those sr-only mobile-trigger strings · low · (found: tdd/res-61_guest_i18n_followups/C3/red)

## product-gaps

- [ ] Reservation-widget toasts/errors still English · `components/site/reservation-widget.tsx` (`Time slot unavailable`, `Reservation confirmed`, `Select a date`) · Spec chrome keys do not include submit/error copy; EN guest on `/` still sees English toasts · med · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/plan)
- [ ] Unused `nav.staff` catalog key · `messages/en.json:4` / `messages/fr.json:4` · `"Staff"` / `"Personnel"` is not in AC-11 and `SiteHeader` never reads it · low · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/C2/green)
- [ ] Header Staff/Book CTAs expose `role=button` · `components/site/site-header.tsx:93-111` · shadcn `Button` + `render={<Link>}` makes navigational chrome announce as buttons; AC-12 describes them as links · low · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/C3/red)
- [ ] Mobile Menu has no active style · `components/site/site-header.tsx:128-134` · desktop has `font-bold`; AC-13 says “the Menu link” without limiting to desktop · low · spec: docs/specs/site-localization.md · (found: tdd/res-61_guest_i18n_followups/C2/refactor)

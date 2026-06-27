# Site chrome (guest header & brand)

**Status:** Draft  
**Last updated:** 2026-06-27

## Scope

Guest-facing site chrome: fixed header/nav and brand logo on public routes.
Component: `components/site/site-header.tsx`. Shared config: `lib/site-chrome.ts`.
Pages: `/` (homepage), `/menu` (digital menu).

## Acceptance criteria

1. **SC-1 — Shared logo config** — `lib/site-chrome.ts` exports `SITE_LOGO` with
   `src="/images/logo.png"`, `width=48`, `height=48`, and `alt` text that
   includes the restaurant name. `SiteHeader` uses this config as the single
   source of truth (no hard-coded 32px logo dimensions).

2. **SC-2 — Homepage header** — `SiteHeader` renders on `/`. There is no
   pathname early-return that hides the header on the homepage.

3. **SC-3 — Single shared header** — `app/[locale]/page.tsx` renders `<SiteHeader />` and
   contains no page-local fixed `<header>` block. `app/[locale]/menu/page.tsx` also
   renders `<SiteHeader />`. Both routes share the same nav: Menu link, Language
   switcher, Staff login, Book a table. Language switcher wiring:
   [site-localization.md](./site-localization.md) criterion 10.

4. **SC-4 — Visual readability (manual-UAT)** — The 48×48 px circular logo is
   visually readable on dark hero backgrounds at `/` and `/menu` in a real
   browser.

5. **SC-5 — Single homepage source (no duplicate route)** — The `/` route is
   served exclusively by the localized `app/[locale]/page.tsx`. No flat,
   non-localized `app/page.tsx` may exist duplicating the homepage body: a static
   flat route shadows the localized route and reintroduces two-places drift for
   header/nav/language-switcher changes (the original REAZED-276 risk).
   Site-chrome structural regression tests target `app/[locale]/page.tsx`.

## References

- `app/[locale]/page.tsx` (canonical homepage; SC-5)
- `components/site/site-header.tsx`
- `lib/site-chrome.ts`
- `public/images/logo.png`
- `tests/unit/site-header.test.ts` (SC-5 structural guard)
- [../PRD/restaurant-system-PRD.md](../PRD/restaurant-system-PRD.md)

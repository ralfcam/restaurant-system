# Site chrome (guest header & brand)

**Status:** Draft  
**Last updated:** 2026-08-18

## Scope

Guest-facing site chrome: fixed header/nav and optional brand logo on public
routes. Component: `components/site/site-header.tsx`. Shared config:
`lib/site-chrome.ts`. Pages: `/` (homepage), `/menu` (digital menu).

The platform is a **Restaurant Link** bootstrapping template: the restaurant
name comes from `RESTAURANT` in `lib/data.ts`, and there is **no bundled
default logo**.

## Acceptance criteria

1. **SC-1 — Shared logo config, empty by default** — `lib/site-chrome.ts`
   exports `SITE_LOGO` with `width=48`, `height=48`, and `alt` text that
   includes the restaurant name. It does **not** set `src`. When no custom
   logo is stored, `SiteHeader` and login render `BrandMark` (null) and the
   restaurant name only — no `/images/logo.png` fallback. Custom upload /
   remove: [branding-cms.md](./branding-cms.md).

2. **SC-2 — Homepage header** — `SiteHeader` renders on `/`. There is no
   pathname early-return that hides the header on the homepage.

3. **SC-3 — Single shared header** — `app/[locale]/page.tsx` renders `<SiteHeader />` and
   contains no page-local fixed `<header>` block. `app/[locale]/menu/page.tsx` also
   renders `<SiteHeader />`. Both routes share the same nav: Menu link, Language
   switcher, Staff login, Book a table. Language switcher wiring:
   [site-localization.md](./site-localization.md) criterion 10.

4. **SC-4 — Visual readability (manual-UAT)** — When a custom logo is set, the
   48×48 px circular mark is visually readable on dark hero backgrounds at
   `/` and `/menu`. When none is set, the restaurant name alone is readable.

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
- `components/site/brand-mark.tsx`
- `tests/unit/site-header.test.ts` (SC-5 structural guard)
- `tests/unit/site-chrome.test.ts` (SC-1 empty-by-default `SITE_LOGO`)
- [../PRD/restaurant-system-PRD.md](../PRD/restaurant-system-PRD.md)

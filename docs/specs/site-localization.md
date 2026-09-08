# Site localization

**Status:** Draft  
**Last updated:** 2026-09-08

## Scope

Public marketing site: home (`/`), menu (`/menu`). Staff chrome (`/admin/**`,
`/pos/**`, `/kds/**` — unified staff-route class per
[staff-authorization.md](staff-authorization.md) SA-2) and staff auth
(`/auth/**`) stay English-only and are excluded from locale routing.
Replaces the per-page EN/FR
toggle in `components/site/menu-browser.tsx` with a navbar language switcher that
controls all public content.

Implementation: `next-intl` URL routing with React Context via `NextIntlClientProvider`.

## Routing

- **Locales:** `fr`, `en`
- **Default locale:** `fr`
- **Prefix strategy:** `as-needed` — French routes are unprefixed (`/`, `/menu`);
  English routes are prefixed (`/en`, `/en/menu`)
- **Excluded paths:** `/admin/**`, `/pos/**`, `/kds/**`, `/auth/**`, `/api/**` —
  no locale segment, no locale middleware redirect; Supabase session middleware
  still runs. `/auth/**` is flat (non-`[locale]`) staff login/callback/error
  routes like `/admin/**`. `/pos/**` and `/kds/**` skip locale routing as staff
  chrome (same class as `/admin/**` per
  [staff-authorization.md](staff-authorization.md) SA-2).

## Acceptance criteria

1. **Routing config** — `i18n/routing.ts` exposes `locales: ['fr','en']`,
   `defaultLocale: 'fr'`, `localePrefix: 'as-needed'`.
2. **Message key parity** — `messages/fr.json` and `messages/en.json` have
   identical key sets; no empty string values.
3. **Middleware scope** — Locale middleware applies to public paths only;
   `/admin/**`, `/pos/**`, `/kds/**`, `/auth/**`, and `/api/**` skip locale
   routing; Supabase `updateSession` runs for all paths. `/auth/**` must skip
   locale routing so flat staff auth pages (e.g. `/auth/login`) are not
   rewritten into a `[locale]` path that has no matching route. `/pos/**` and
   `/kds/**` skip locale routing as staff chrome (unified with `/admin/**` per
   [staff-authorization.md](staff-authorization.md) SA-2).
4. **Switch-path helper** — `localizedPathname(path, targetLocale)` maps paths
   under as-needed rules: `/menu`→`/en/menu`, `/en/menu`→`/menu`, `/`→`/en`,
   `/en`→`/`.
5. **Home default locale** — Visiting `/` renders French copy; navbar shows an
   EN language switcher.
6. **Toggle switches locale** — Clicking the switcher on `/` navigates to `/en`
   and renders English copy.
7. **Menu localized by URL** — `/menu` renders French menu content;
   `/en/menu` renders English menu content; the in-content Globe EN/FR toggle
   is removed.
8. **Admin stays unlocalized** — `/admin` is not locale-prefixed and is not
   redirected to `/fr`.
9. **Translation quality** _(manual-UAT)_ — Both languages read naturally; no
   layout overflow or clipping in FR or EN.
10. **Header switcher wired** — `LanguageSwitcher` is rendered by `SiteHeader`
    (shared navbar), not inside page `<main>`. It appears in the desktop actions
    region and the mobile nav sheet. Structural regression: `site-header.tsx`
    imports and renders `<LanguageSwitcher>`.
11. **Header chrome from catalogs** — `SiteHeader` renders the Menu link, Staff
    login, Book a table, and the mobile-trigger sr-only label from `nav.menu`,
    `nav.staffLogin`, `nav.bookTable`, and `nav.openMenu` — not hardcoded
    English. On `/` the distinguishing strings are the French catalog values
    (`Connexion personnel`, `Réserver une table`, `Ouvrir le menu`). On `/en`
    they are the English catalog values (`Staff login`, `Book a table`,
    `Open menu`). `nav.menu` is `"Menu"` in both catalogs and is not a
    locale-distinguishing assertion.
12. **Locale-aware guest header links** — Logo (`/`), Menu (`/menu`), and Book
    a table (`/#reserve`) use next-intl `Link` from `i18n/navigation.ts` (or
    equivalent `localizedPathname` hrefs). An EN visitor on `/en` clicking Menu
    lands on `/en/menu`; logo on `/en`; Book on `/en#reserve` or `/en/#reserve`.
    Staff login (`/admin`) stays unprefixed and MUST NOT become `/en/admin`
    (AC-8).
13. **Localized active nav** — The Menu link is active when the locale-stripped
    pathname is `/menu` (both `/menu` and `/en/menu`). It is not active on `/`
    or `/en`.
14. **Mobile sheet closes on language switch** — Activating `LanguageSwitcher`
    inside the mobile nav sheet closes the sheet (same as Menu / Staff login /
    Book a table already do).
15. **Dual switcher regions** — The AC-10 structural test asserts one
    `LanguageSwitcher` in the desktop actions region and a second in the mobile
    nav sheet — not a single `<LanguageSwitcher` regex hit.
16. **Document language follows route** — A helper `resolveDocumentLang(pathname)`
    returns `fr` for unprefixed public paths (`/`, `/menu`), `en` for `/en` and
    `/en/**`, and `en` for staff/auth paths (`/admin/**`, `/pos/**`, `/kds/**`,
    `/auth/**`). The root `<html lang>` uses that value so `/en` is not
    announced as French and staff chrome is not announced as French.

## Implementation trace (non-normative)

| Criterion | Shipped in                                                                                        | Tests                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| AC-3      | `i18n/middleware-scope.ts` `LOCALE_EXCLUDED_PREFIXES` (`/admin`, `/api`, `/auth`, `/pos`, `/kds`) | `tests/unit/i18n/middleware-scope.test.ts` → "pos and kds are excluded from localization" |

## Message catalog keys (public site)

Navbar, hero, booking card, info strip, chef's picks, features, footer, menu page
chrome (title, empty states, footer note labels). Menu item names/descriptions
continue to come from DB `_en` columns keyed by route locale.

## References

- [../architecture/Platform-Overview.md](../architecture/Platform-Overview.md)
- [staff-authorization.md](staff-authorization.md) SA-2 (staff chrome `/admin`,
  `/pos`, `/kds`)
- `components/site/site-header.tsx`, `components/site/menu-browser.tsx`
- `proxy.ts`, `i18n/middleware-scope.ts`, `app/layout.tsx`

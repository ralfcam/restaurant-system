# Site localization

**Status:** Draft  
**Last updated:** 2026-06-27

## Scope

Public marketing site: home (`/`), menu (`/menu`). Staff/admin (`/admin/**`) and
staff auth (`/auth/**`) stay English-only and are excluded from locale routing.
Replaces the per-page EN/FR
toggle in `components/site/menu-browser.tsx` with a navbar language switcher that
controls all public content.

Implementation: `next-intl` URL routing with React Context via `NextIntlClientProvider`.

## Routing

- **Locales:** `fr`, `en`
- **Default locale:** `fr`
- **Prefix strategy:** `as-needed` — French routes are unprefixed (`/`, `/menu`);
  English routes are prefixed (`/en`, `/en/menu`)
- **Excluded paths:** `/admin/**`, `/auth/**`, `/api/**` — no locale segment, no
  locale middleware redirect; Supabase session middleware still runs. `/auth/**`
  is flat (non-`[locale]`) staff login/callback/error routes like `/admin/**`.

## Acceptance criteria

1. **Routing config** — `i18n/routing.ts` exposes `locales: ['fr','en']`,
   `defaultLocale: 'fr'`, `localePrefix: 'as-needed'`.
2. **Message key parity** — `messages/fr.json` and `messages/en.json` have
   identical key sets; no empty string values.
3. **Middleware scope** — Locale middleware applies to public paths only;
   `/admin/**`, `/auth/**`, and `/api/**` skip locale routing; Supabase
   `updateSession` runs for all paths. `/auth/**` must skip locale routing so
   flat staff auth pages (e.g. `/auth/login`) are not rewritten into a
   `[locale]` path that has no matching route.
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
9. **Translation quality** *(manual-UAT)* — Both languages read naturally; no
   layout overflow or clipping in FR or EN.
10. **Header switcher wired** — `LanguageSwitcher` is rendered by `SiteHeader`
    (shared navbar), not inside page `<main>`. It appears in the desktop actions
    region and the mobile nav sheet. Structural regression: `site-header.tsx`
    imports and renders `<LanguageSwitcher>`.

## Message catalog keys (public site)

Navbar, hero, booking card, info strip, chef's picks, features, footer, menu page
chrome (title, empty states, footer note labels). Menu item names/descriptions
continue to come from DB `_en` columns keyed by route locale.

## References

- [../architecture/Platform-Overview.md](../architecture/Platform-Overview.md)
- `components/site/site-header.tsx`, `components/site/menu-browser.tsx`
- `middleware.ts`, `i18n/middleware-scope.ts`, `app/layout.tsx`

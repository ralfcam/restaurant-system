# Site localization

**Status:** Draft  
**Last updated:** 2026-09-09

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
   [staff-authorization.md](staff-authorization.md) SA-2). Exclusion prefixes
   are path-segment-bounded: a pathname matches only when it equals the prefix
   or continues with `/` (`/auth`, `/auth/`, `/auth/**` — not `/authorship`;
   same rule for `/admin`, `/api`, `/pos`, `/kds`). `/auth/**` includes
   `/auth/login`, `/auth/callback`, and `/auth/error`. `/auth/**` skip MUST be
   proven through the composition root (`proxy` + `updateSession`, locale
   middleware not applied), matching the existing `/admin/**` pin.
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
17. **Document language stays in sync after client navigation** — After
    client-side navigation that changes the public locale or the public/staff
    class (including `LanguageSwitcher` and guest→staff links),
    `document.documentElement.lang` equals `resolveDocumentLang` of the current
    pathname. The root layout does not re-render on client navigation, so a
    client component mounted from `app/layout.tsx` MUST read `usePathname()`
    from `next/navigation`, pass that pathname to `resolveDocumentLang`, and
    write `document.documentElement.lang`. First paint may keep using the
    server `lang` on `<html>`.
18. **Session cookies survive locale merge** — On a localize path, every
    cookie present on the `updateSession` response MUST appear on the composed
    `proxy` response. `cookies.set` MUST forward the options object from
    `getAll()` (`httpOnly`, `secure`, `sameSite`, `path`, and `maxAge` /
    `expires` when present). Name/value-only copy does not satisfy this
    criterion. Skip-locale paths already return the session response unchanged.
19. **Segment-bounded locale exclusion** — `resolveLocaleRoutingDecision`
    returns `skip-locale` iff the pathname is exactly an excluded prefix or is
    that prefix plus `/…`. Lookalikes that only share a string prefix
    (`/authorship`, `/administrator`, `/apiculture`, `/postal`, `/kdssuffix`)
    return `localize`. `/auth/error` returns `skip-locale`. `proxy("/auth/error")`
    and `proxy("/auth/login")` MUST call `updateSession` and MUST return that
    session response (locale middleware not applied).

## Implementation trace (non-normative)

FEATURE `res-61_guest_i18n_followups` (RES-61, 2026-09-08). AC-11–AC-16 shipped; AC-9 remains manual-UAT.
FEATURE `html_lang_pnpm_pin_70d248bc` (2026-09-09). AC-17 shipped.
FIX `res-50_locale_mw_session_cookies_a3f1c8e2` (RES-50, 2026-09-09). AC-18/AC-19 shipped.

| Criterion | Shipped in                                                                                                                                                                                                                               | Tests                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-3      | `i18n/middleware-scope.ts` `LOCALE_EXCLUDED_PREFIXES` (`/admin`, `/api`, `/auth`, `/pos`, `/kds`)                                                                                                                                        | `tests/unit/i18n/middleware-scope.test.ts` → "pos and kds are excluded from localization"                                                                         |
| AC-11     | `SiteHeader` `useTranslations("nav")` — `{t("menu")}`, `{t("staffLogin")}`, `{t("bookTable")}`, `{t("openMenu")}` in `components/site/site-header.tsx`                                                                                   | `tests/unit/i18n/site-header-chrome.test.ts` → "site header renders nav catalog keys"; `tests/e2e/localization.spec.ts` → "navbar chrome follows locale catalogs" |
| AC-12     | Guest logo (`/`), Menu (`/menu`), Book (`/#reserve`) use `Link` from `@/i18n/navigation`; staff `/admin` uses `NextLink` from `next/link` in `components/site/site-header.tsx`                                                           | `tests/unit/i18n/site-header-locale-nav.test.ts` → "header guest links use next-intl Link; staff login stays /admin"                                              |
| AC-13     | `isActiveNavPath` in `lib/i18n/localized-pathname.ts` (private `stripLocalePrefix`); desktop Menu `isActiveNavPath(pathname, "/menu") && "font-bold"`                                                                                    | `tests/unit/i18n/localized-pathname.test.ts` → "isActiveNavPath matches locale-stripped /menu"                                                                    |
| AC-14     | Sheet `LanguageSwitcher` `onClick={() => setMobileMenuOpen(false)}`; `LanguageSwitcher` forwards `onClick` onto `Button`                                                                                                                 | `tests/unit/i18n/site-header-sheet-switcher.test.ts` → "mobile LanguageSwitcher closes the sheet"                                                                 |
| AC-15     | Two `LanguageSwitcher` instances in `components/site/site-header.tsx` — desktop actions region and `SheetContent`                                                                                                                        | `tests/unit/i18n/site-header-switcher.test.ts` → "site header renders LanguageSwitcher in desktop actions and mobile sheet"                                       |
| AC-16     | `resolveDocumentLang` in `lib/i18n/document-lang.ts`; `app/layout.tsx` `pathnameFromRequestHeaders` + `<html lang={resolveDocumentLang(…)}>`                                                                                             | `tests/unit/i18n/document-lang.test.ts` → "resolveDocumentLang follows public locale and staff English"                                                           |
| AC-17     | `DocumentLangSync` in `lib/i18n/document-lang-sync.tsx` (`"use client"`, `usePathname`, `useLayoutEffect` → `document.documentElement.lang`); `app/layout.tsx` mounts `<DocumentLangSync />` (first paint still AC-16 `<html lang={…}>`) | `tests/unit/i18n/document-lang.test.ts` → "layout mounts a client document-lang sync from usePathname"                                                            |
| AC-18     | `proxy.ts` copies `sessionResponse.cookies?.getAll()` via `{ name, value, ...options }` into `intlResponse.cookies.set(name, value, options)`                                                                                            | `tests/unit/i18n/middleware-scope.test.ts` → "session cookies and Set-Cookie options survive locale merge"                                                        |
| AC-19     | `i18n/middleware-scope.ts` `resolveLocaleRoutingDecision` matches `pathname === prefix \|\| pathname.startsWith(prefix + "/")`                                                                                                           | `tests/unit/i18n/middleware-scope.test.ts` → "locale exclusion is segment-bounded including auth/error through proxy"                                             |

## Message catalog keys (public site)

Navbar, hero, booking card, info strip, chef's picks, features, footer, menu page
chrome (title, empty states, footer note labels). Menu item names/descriptions
continue to come from DB `_en` columns keyed by route locale.

## References

- [../architecture/Platform-Overview.md](../architecture/Platform-Overview.md)
- [staff-authorization.md](staff-authorization.md) SA-2 (staff chrome `/admin`,
  `/pos`, `/kds`)
- `components/site/site-header.tsx`, `components/site/language-switcher.tsx`,
  `components/site/menu-browser.tsx`
- `lib/i18n/localized-pathname.ts` (`localizedPathname`, `isActiveNavPath`),
  `lib/i18n/document-lang.ts` (`resolveDocumentLang`),
  `lib/i18n/document-lang-sync.tsx` (`DocumentLangSync`)
- `proxy.ts`, `i18n/middleware-scope.ts`, `app/layout.tsx`

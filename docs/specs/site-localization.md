# Site localization

**Status:** Draft  
**Last updated:** 2026-09-24

## Scope

Whole product system copy. Guest routes keep FR/EN `as-needed` routing: home
(`/`), menu (`/menu`), English prefixed (`/en`, `/en/menu`). The navbar
language switcher replaces the per-page EN/FR toggle in
`components/site/menu-browser.tsx` and controls public content.

Staff routes (`/admin/**`, `/auth/**`, `/pos/**`, `/kds/**` — unified
staff-route class per [staff-authorization.md](staff-authorization.md) SA-2)
stay unprefixed and excluded from locale middleware. They render French-only
from the `fr` catalog. There is no staff language switcher.

Implementation: `next-intl` URL routing with React Context via
`NextIntlClientProvider`. Staff layouts mount the same provider with locale
`fr`.

## System copy vs data

System copy (labels, buttons, errors, statuses, empty states, aria text,
toasts, metadata titles) comes from the message catalogs. Operator-entered
data is not system copy: dish names, menu tab titles, table labels, restaurant
name, segment labels and notes, review-email copy, and guest names. Emails are
out of scope: the booking confirmation has no prose, and the review email is
operator copy.

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
8. **Staff routes stay unprefixed** — `/admin/**`, `/auth/**`, `/pos/**`, and
   `/kds/**` are not locale-prefixed and are not redirected to `/fr/…` or
   `/en/…` (no `/fr/admin`, `/en/admin`, and the same for auth, pos, and kds).
   Rendering language is French-only (AC-20), not a second locale route.
9. **Translation quality** _(manual-UAT)_ — Guest FR and EN read naturally.
   Staff surfaces (`/admin/**`, `/auth/**`, `/pos/**`, `/kds/**`) are
   French-only and read naturally. No layout overflow or clipping on desktop
   or mobile across guest and staff surfaces.
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
    `/en/**`, and `fr` for staff/auth paths (`/admin/**`, `/pos/**`, `/kds/**`,
    `/auth/**`). The root `<html lang>` uses that value so `/en` is not
    announced as French and staff chrome is announced as French. `/api/**`
    document-lang behavior is unchanged by this amendment.
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
20. **Staff French locale** — Staff layouts `app/admin/layout.tsx`,
    `app/pos/layout.tsx`, `app/kds/layout.tsx`, and `app/auth/layout.tsx` each
    mount `NextIntlClientProvider` with locale `fr` and the French messages.
    `i18n/request.ts`, when no request locale is present, resolves locale `fr`
    and messages that include a `staff` namespace. Server components on staff
    routes read copy with `getTranslations`. Staff namespaces also exist in
    `messages/en.json` (AC-2 parity). There is no staff language switcher.
21. **Server message keys** — Every user-visible message returned or thrown by
    server actions and lib validators is a catalog key under `errors.*`. Each
    key resolves to a non-empty value in both `messages/fr.json` and
    `messages/en.json`. Postgres booking denials raised as `P0001` map to
    specific `errors.*` keys (not the raw trigger text). Raw database or
    PostgREST error text never reaches the UI; unmapped failures use one
    generic `errors.*` key. Clients render the key with `t()` (or
    `getTranslations`). Client branches that today match English sentences
    (fully-booked in-form message, slot-unavailable toast) branch on the error
    key; the user-visible behavior of those branches is unchanged. Covered
    producers: reservation validation and create / status / undo / assign /
    list (`app/actions/reservations.ts`, `lib/reservations/validation.ts`);
    floor, POS, and KDS (`app/actions/operations.ts`, `lib/floor/table-use.ts`,
    `lib/floor/merge-drop.ts`); scheduling (`app/actions/availability.ts`,
    `validateOperatingDays`, `app/actions/restaurant-info.ts`); branding,
    marketing, and menu (`lib/branding.ts`, `app/actions/branding.ts`,
    `app/actions/marketing.ts`, `app/actions/menu.ts`); inquiries, analytics,
    and guest profiles (`app/actions/inquiries.ts`, `app/actions/analytics.ts`,
    `app/actions/guest-profiles.ts`, `lib/inquiries/validation.ts`,
    `lib/analytics/report.ts`, `lib/reservations/list-empty-copy.ts`).
22. **Operating-hours labels** — Day names, short day labels, closed and
    hours-unavailable copy, default segment suggestions, and
    `summarizeOperatingDays` take a locale argument. Staff callers pass `fr`.
    The guest info bar passes the route locale.
    `summarizeOperatingDays(days, "fr")` yields French day and closed labels;
    `summarizeOperatingDays(days, "en")` yields English.
23. **Explicit locale formatting** — Staff date and time formatting passes
    locale `fr`. No call under staff or guest UI files passes `undefined`,
    `[]`, or `"default"` as the locale argument to `toLocaleString`,
    `toLocaleDateString`, or `toLocaleTimeString`. Guest calendar weekday and
    month labels in `components/site/reservation-calendar.tsx` follow the
    route locale.
24. **Status labels** — Reservation, table, kitchen-ticket, inquiry, and
    weekly-overview statuses render from `status.*` catalog keys. Maps expose
    keys, not English label strings. French `status.*` values differ from
    English. Raw enum values are not rendered in inquiries, the customer
    ficha, POS, or the undo toast.
25. **Surface catalogs** — Each surface below imports next-intl
    (`useTranslations` or `getTranslations`), contains no hard-coded system
    copy, and every referenced catalog key resolves to a non-empty leaf in
    both `fr` and `en`. Hard-coded copy means JSX text, and string literals
    passed to `title`, `placeholder`, `aria-label`, `alt`, `label`, or
    `description`, plus `toast.*` literals and label-map literals.
    Language-neutral tokens (for example `CHF`) may be allowlisted per test.
    Operator-entered data is exempt (see System copy vs data).

    a. Staff shell and sidebar logo —
    `components/staff/staff-shell.tsx`,
    `components/staff/sidebar-logo-manager.tsx`.
    b. Auth login and error — `app/auth/login/page.tsx`,
    `app/auth/error/page.tsx`.
    c. Dashboard and weekly overview — `app/admin/page.tsx`,
    `components/staff/weekly-service-overview.tsx`.
    d. Reservations manager and page —
    `components/staff/reservations-manager.tsx`,
    `app/admin/reservations/page.tsx`.
    e. Guest booking flow — `components/site/reservation-widget.tsx`,
    `components/site/reservation-calendar.tsx`.
    f. POS — `app/pos/page.tsx`, `components/staff/pos-terminal.tsx`.
    g. KDS — `app/kds/page.tsx`, `components/staff/kds-board.tsx`.
    h. Floor plan — `app/admin/floor/page.tsx`,
    `components/staff/floor-plan.tsx`, and `formatDurationMinutes` unit
    labels in `lib/floor/table-use.ts`.
    i. Menu manager — `app/admin/menu/page.tsx`,
    `components/staff/menu-manager.tsx` (dish names and menu titles stay
    data).
    j. Scheduling — `app/admin/scheduling/page.tsx`,
    `components/staff/scheduling-manager.tsx`.
    k. Branding and marketing — `app/admin/settings/page.tsx`,
    `components/staff/restaurant-logo-editor.tsx`,
    `components/staff/restaurant-hero-image-editor.tsx`,
    `app/admin/marketing/page.tsx`,
    `app/admin/marketing/review-email-settings-form.tsx` (operator email
    body stays data).
    l. Inquiries, customer ficha, and analytics —
    `components/staff/inquiries-manager.tsx`,
    `app/admin/inquiries/page.tsx`,
    `app/admin/customers/[email]/page.tsx`,
    `app/admin/analytics/page.tsx`.
    m. Guest leftovers and metadata — image alts, logo alt, tagline, hours
    fallback, and localized metadata (root layout, `[locale]` layout, and
    staff `generateMetadata`).

26. **Global hard-coded copy sweep** — Every `.ts` / `.tsx` file under
    `app/admin`, `app/auth`, `app/pos`, `app/kds`, `app/[locale]`,
    `components/staff`, and `components/site` passes the same copy scan as
    AC-25. Every `fr` catalog leaf differs from its `en` leaf except a
    test-listed neutral allowlist (for example `nav.menu`,
    `menuBrowser.signature`).

## Implementation trace (non-normative)

FEATURE `res-61_guest_i18n_followups` (RES-61, 2026-09-08). AC-11–AC-16 shipped; AC-9 remains manual-UAT.
FEATURE `html_lang_pnpm_pin_70d248bc` (2026-09-09). AC-17 shipped.
FIX `res-50_locale_mw_session_cookies_a3f1c8e2` (RES-50, 2026-09-09). AC-18/AC-19 shipped.
FIX `res-77_full_french_ui_830c8b81` (RES-77, 2026-09-24). AC-8, AC-16, AC-20–AC-26 shipped; AC-9 remains manual-UAT. AC-22: `summarizeOperatingDays` is locale-aware; `DAY_NAMES` / `SUGGESTED_SEGMENTS` stay English (drift vs criterion text).

| Criterion | Shipped in                                                                                                                                                                                                                                        | Tests                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-3      | `i18n/middleware-scope.ts` `LOCALE_EXCLUDED_PREFIXES` (`/admin`, `/api`, `/auth`, `/pos`, `/kds`)                                                                                                                                                 | `tests/unit/i18n/middleware-scope.test.ts` → "pos and kds are excluded from localization"                                                                                                                                        |
| AC-8      | Staff `/admin/**`, `/auth/**`, `/pos/**`, `/kds/**` stay unprefixed (AC-3 / AC-19); French-only rendering via AC-20 staff/auth layout providers                                                                                                   | `tests/unit/i18n/staff-locale.test.ts` → "staff layouts mount French"; `tests/unit/i18n/middleware-scope.test.ts` → "pos and kds are excluded from localization"                                                                 |
| AC-9      | _(manual-UAT)_ Guest FR/EN and staff French natural-read / layout review. E2E smoke only: login French heading + `html[lang=fr]`; guest widget FR/EN labels                                                                                       | `tests/e2e/localization.spec.ts` → "login shows a French heading and html lang fr"; "booking widget shows French labels on / and English labels on /en"                                                                          |
| AC-11     | `SiteHeader` `useTranslations("nav")` — `{t("menu")}`, `{t("staffLogin")}`, `{t("bookTable")}`, `{t("openMenu")}` in `components/site/site-header.tsx`                                                                                            | `tests/unit/i18n/site-header-chrome.test.ts` → "site header renders nav catalog keys"; `tests/e2e/localization.spec.ts` → "navbar chrome follows locale catalogs"                                                                |
| AC-12     | Guest logo (`/`), Menu (`/menu`), Book (`/#reserve`) use `Link` from `@/i18n/navigation`; staff `/admin` uses `NextLink` from `next/link` in `components/site/site-header.tsx`                                                                    | `tests/unit/i18n/site-header-locale-nav.test.ts` → "header guest links use next-intl Link; staff login stays /admin"                                                                                                             |
| AC-13     | `isActiveNavPath` in `lib/i18n/localized-pathname.ts` (private `stripLocalePrefix`); desktop Menu `isActiveNavPath(pathname, "/menu") && "font-bold"`                                                                                             | `tests/unit/i18n/localized-pathname.test.ts` → "isActiveNavPath matches locale-stripped /menu"                                                                                                                                   |
| AC-14     | Sheet `LanguageSwitcher` `onClick={() => setMobileMenuOpen(false)}`; `LanguageSwitcher` forwards `onClick` onto `Button`                                                                                                                          | `tests/unit/i18n/site-header-sheet-switcher.test.ts` → "mobile LanguageSwitcher closes the sheet"                                                                                                                                |
| AC-15     | Two `LanguageSwitcher` instances in `components/site/site-header.tsx` — desktop actions region and `SheetContent`                                                                                                                                 | `tests/unit/i18n/site-header-switcher.test.ts` → "site header renders LanguageSwitcher in desktop actions and mobile sheet"                                                                                                      |
| AC-16     | `resolveDocumentLang` in `lib/i18n/document-lang.ts` — staff/auth `fr`, `/api` stays `en`; `app/layout.tsx` `pathnameFromRequestHeaders` staff sentinel + `<html lang={resolveDocumentLang(…)}>`                                                  | `tests/unit/i18n/document-lang.test.ts` → "resolveDocumentLang follows public locale and staff French"                                                                                                                           |
| AC-17     | `DocumentLangSync` in `lib/i18n/document-lang-sync.tsx` (`"use client"`, `usePathname`, `useLayoutEffect` → `document.documentElement.lang`); `app/layout.tsx` mounts `<DocumentLangSync />` (first paint still AC-16 `<html lang={…}>`)          | `tests/unit/i18n/document-lang.test.ts` → "layout mounts a client document-lang sync from usePathname"                                                                                                                           |
| AC-18     | `proxy.ts` copies `sessionResponse.cookies?.getAll()` via `{ name, value, ...options }` into `intlResponse.cookies.set(name, value, options)`                                                                                                     | `tests/unit/i18n/middleware-scope.test.ts` → "session cookies and Set-Cookie options survive locale merge"                                                                                                                       |
| AC-19     | `i18n/middleware-scope.ts` `resolveLocaleRoutingDecision` matches `pathname === prefix \|\| pathname.startsWith(prefix + "/")`                                                                                                                    | `tests/unit/i18n/middleware-scope.test.ts` → "locale exclusion is segment-bounded including auth/error through proxy"                                                                                                            |
| AC-20     | `app/admin/layout.tsx`, `app/pos/layout.tsx`, `app/kds/layout.tsx`, `app/auth/layout.tsx` each mount `NextIntlClientProvider` locale `fr` + `getMessages()`; `i18n/request.ts` default `fr` + `staff` namespace in `messages/fr.json` / `en.json` | `tests/unit/i18n/staff-locale.test.ts` → "staff layouts mount French"                                                                                                                                                            |
| AC-21     | User-visible server failures are bare `errors.*` keys (reservations, floor/POS/KDS, scheduling, branding/menu/marketing, inquiries/analytics/guest-profiles); clients `t()` the key                                                               | `tests/unit/reservations/message-keys.test.ts`; `tests/unit/floor/message-keys.test.ts`; `tests/unit/availability/message-keys.test.ts`; `tests/unit/branding/message-keys.test.ts`; `tests/unit/inquiries/message-keys.test.ts` |
| AC-22     | `summarizeOperatingDays(days, locale)` + `HOURS_SUMMARY_COPY` in `lib/reservations/operating-hours.ts`; staff callers pass `"fr"`. `DAY_NAMES` / `SUGGESTED_SEGMENTS` stay English (criterion drift)                                              | `tests/unit/reservations/operating-hours.test.ts` → "summarizeOperatingDays takes a locale"                                                                                                                                      |
| AC-23     | Staff `toLocale*String` / date formatters pass `"fr"`; guest calendar weekday/month labels follow `useLocale()` in `components/site/reservation-calendar.tsx`                                                                                     | `tests/unit/i18n/locale-formatting.test.ts` → "staff formatters pass fr"                                                                                                                                                         |
| AC-24     | Reservation / table / kitchen / inquiry / weekly statuses from `status.*` catalog keys (`RESERVATION_STATUS_META`, `TABLE_STATUS_META`, etc.)                                                                                                     | `tests/unit/i18n/status-labels.test.ts` → "status labels come from catalogs"                                                                                                                                                     |
| AC-25     | Staff + guest surfaces use `useTranslations` / `getTranslations` with dotted catalog keys (`staff.*`, `auth.*`, booking, metadata); `generateMetadata` owns icons + catalog title where present                                                   | `tests/unit/i18n/staff-surfaces/*.test.ts`; `tests/unit/i18n/guest-surfaces/*.test.ts`; `tests/unit/i18n/staff-surfaces/shell.test.ts`                                                                                           |
| AC-26     | Hard-coded system-copy sweep under `app/admin`, `app/auth`, `app/pos`, `app/kds`, `app/[locale]`, `components/staff`, `components/site`; FR≠EN leaf check with neutral allowlist                                                                  | `tests/unit/i18n/no-hardcoded-copy.test.ts` → "finds no hard-coded system copy under staff and guest surfaces"                                                                                                                   |

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

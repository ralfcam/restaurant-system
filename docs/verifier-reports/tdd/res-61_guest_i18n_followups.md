# TDD log: res-61_guest_i18n_followups

## C1

Suggested review order:
- Dual-link contract (guest locale prefix vs staff unprefixed) **[public-api]**
  - `components/site/site-header.tsx:4` — `NextLink` from `next/link`
  - `components/site/site-header.tsx:6` — `Link` from `@/i18n/navigation`
  - `i18n/navigation.ts:4` — `createNavigation` `Link` (prefix source)
- Staff `/admin` stays unprefixed **[public-api]**
  - `components/site/site-header.tsx:103` — desktop `NextLink href="/admin"`
  - `components/site/site-header.tsx:149` — mobile `NextLink href="/admin"`
- Guest hrefs (prefix applied by next-intl `Link`)
  - `components/site/site-header.tsx:57` — logo `href="/"`
  - `components/site/site-header.tsx:20` + `:73-75` / `:132-134` — Menu `"/menu"`
  - `components/site/site-header.tsx:111` + `:158` — Book `href="/#reserve"`
- Source contract
  - `tests/unit/i18n/site-header-locale-nav.test.ts:17-28`

Reusable pattern: Guest chrome uses next-intl `Link` from `@/i18n/navigation`; staff `/admin` uses aliased `NextLink` from `next/link` so locale prefixing cannot produce `/en/admin` (same split as the homepage footer).

## C2

Suggested review order:
- Catalog-driven chrome **[public-api]**
  - `components/site/site-header.tsx:6` `useTranslations` from `next-intl`
  - `components/site/site-header.tsx:25` `useTranslations("nav")`
  - `components/site/site-header.tsx:80` `{t("menu")}` desktop
  - `components/site/site-header.tsx:108` `{t("staffLogin")}` desktop
  - `components/site/site-header.tsx:110` `{t("bookTable")}` desktop
  - `components/site/site-header.tsx:124` `{t("openMenu")}` sr-only
  - `components/site/site-header.tsx:133` `{t("menu")}` mobile
  - `components/site/site-header.tsx:147` `{t("staffLogin")}` mobile
  - `components/site/site-header.tsx:155` `{t("bookTable")}` mobile
- Inlined guest Menu href (locale `Link`, no leftover list)
  - `components/site/site-header.tsx:72-81` desktop `/menu`
  - `components/site/site-header.tsx:128-134` mobile `/menu`
- Locale-unaware active compare (leftover, C4) **[public-api]**
  - `components/site/site-header.tsx:5` `usePathname` from `next/navigation`
  - `components/site/site-header.tsx:77` `pathname === "/menu"`

Reusable pattern: After chrome moves to `t("key")`, delete the leftover hardcoded-label array and one-item `.map` — inline the single Link so dead English cannot drift from the catalog.

## C3

Suggested review order:
- Rendered FR/EN nav chrome **[public-api]**
  - `tests/e2e/localization.spec.ts:58-77` — `@p1` `@guest` button names
  - `components/site/site-header.tsx:108` `{t("staffLogin")}`
  - `components/site/site-header.tsx:110` `{t("bookTable")}`

Reusable pattern: Guest header Staff/Book CTAs are shadcn `Button` + `render={<Link>}` (`role=button`). E2e AC-11 locators must use `getByRole('button')`, not `link`.

C3-green: skipped — C2 already rendered catalogs; e2e already-GREEN after locator fix (orchestrator verified).

C3-refactor re-verify: `pnpm exec playwright test tests/e2e/localization.spec.ts --project=chromium -g "navbar chrome"` → 1 passed.

## C4

Suggested review order:
- Active-nav contract `[public-api]`
  - `lib/i18n/localized-pathname.ts:40` — `isActiveNavPath` exact-equals after strip
  - `lib/i18n/localized-pathname.ts:5` — private `stripLocalePrefix` (skips default locale `fr`)
- Desktop Menu highlight `[public-api]`
  - `components/site/site-header.tsx:78` — `isActiveNavPath(pathname, "/menu") && "font-bold"`
  - `components/site/site-header.tsx:25` — `usePathname()` from `next/navigation` (locale-prefixed)
- Import grouping
  - `components/site/site-header.tsx:15` — helper with other `@/lib` imports

Reusable pattern: Keep `stripLocalePrefix` private and export `isActiveNavPath(pathname, href)` next to `localizedPathname` so language-switcher rewrite and header active-state share one strip; compare the stripped path to the unprefixed href (do not use `pathname === "/menu"` when `usePathname` is from `next/navigation`).

## C5

Suggested review order:
- Document-lang contract — `lib/i18n/document-lang.ts:3` [public-api]
- Document-lang contract — `lib/i18n/document-lang.ts:4-12`
- Root html lang wiring — `app/layout.tsx:82` [public-api]
- Root html lang wiring — `app/layout.tsx:83`
- Root html lang wiring — `app/layout.tsx:86-87` [public-api]
- Pathname-from-headers fallback — `app/layout.tsx:52-56`
- Pathname-from-headers fallback — `app/layout.tsx:70-74` [public-api]
- Import grouping — `app/layout.tsx:1-7`

Reusable pattern: Root `<html lang>` stays a pure `resolveDocumentLang(pathname)` plus an in-layout `headers()` reader (`X-NEXT-INTL-LOCALE` for public routes, synthetic staff path when locale middleware is skipped); do not extract the header reader until a second caller exists.

## C6

Suggested review order:
- Sheet close contract [public-api]
  - `components/site/site-header.tsx:116` — controlled `Sheet`
  - `components/site/site-header.tsx:136` — sheet `LanguageSwitcher` `onClick={() => setMobileMenuOpen(false)}` [public-api]
- onClick forwarding [public-api]
  - `components/site/language-switcher.tsx:11` — optional `onClick` prop
  - `components/site/language-switcher.tsx:32` — forwarded onto `Button`

Reusable pattern: Forward an optional `onClick` through a `Button`+`NextLink` compose so a controlled sheet can close the same way as sibling nav actions; pin the sheet tag with a brace-aware JSX extractor so `onClick={() =>` `>` cannot truncate.

## C7

Suggested review order:
- Dual-region contract [public-api]
  - `tests/unit/i18n/site-header-switcher.test.ts:25`
  - `tests/unit/i18n/site-header-switcher.test.ts:28`
- Desktop actions instance [public-api]
  - `components/site/site-header.tsx:85`
- Mobile sheet instance [public-api]
  - `components/site/site-header.tsx:136`

Reusable pattern: Strengthen a single JSX-hit structural test by asserting total count plus one match inside each named region slice; when prior criteria already render both instances, skip Green but still re-run the named suite in Refactor.

## Suggested Review Order (collated)

Highest-risk first, grouped by concern.

### [public-api] Locale prefix vs staff unprefixed
- `components/site/site-header.tsx:4` — `NextLink` from `next/link` for `/admin`
- `components/site/site-header.tsx:6` — `Link` from `@/i18n/navigation` for guest hrefs
- `i18n/navigation.ts:4` — `createNavigation` prefix source
- `components/site/site-header.tsx` desktop/mobile `NextLink href="/admin"`

### [public-api] Document language
- `lib/i18n/document-lang.ts:3-12` — `resolveDocumentLang`
- `app/layout.tsx:82-87` — `await headers()` + `<html lang={…}>`
- `app/layout.tsx:70-74` — `X-NEXT-INTL-LOCALE` / synthetic `/admin` fallback

### [public-api] Catalog chrome + rendered FR/EN
- `components/site/site-header.tsx:25` — `useTranslations("nav")`
- `components/site/site-header.tsx` — `{t("staffLogin")}` / `{t("bookTable")}` desktop + mobile
- `tests/e2e/localization.spec.ts:58-77` — `@p1` button names

### [public-api] Active nav + sheet close
- `lib/i18n/localized-pathname.ts:40` — `isActiveNavPath`
- `components/site/site-header.tsx:78` — desktop Menu `font-bold`
- `components/site/language-switcher.tsx:32` — forwarded `onClick`
- `components/site/site-header.tsx:136` — sheet switcher closes sheet

## Traceability (final)

Run: 2026-09-08 · plan: res-61_guest_i18n_followups · issue: RES-61

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | site-localization.md AC-12 | site-header-locale-nav.test.ts::header guest links use next-intl Link; staff login stays /admin | components/site/site-header.tsx | P1 | shipped |
| C2 | site-localization.md AC-11 | site-header-chrome.test.ts::site header renders nav catalog keys | components/site/site-header.tsx | P1 | shipped |
| C3 | site-localization.md AC-11 | localization.spec.ts::navbar chrome follows locale catalogs | components/site/site-header.tsx | P1 | shipped |
| C4 | site-localization.md AC-13 | localized-pathname.test.ts::isActiveNavPath matches locale-stripped /menu | lib/i18n/localized-pathname.ts, components/site/site-header.tsx | P2 | shipped |
| C5 | site-localization.md AC-16 | document-lang.test.ts::resolveDocumentLang follows public locale and staff English | lib/i18n/document-lang.ts, app/layout.tsx | P2 | shipped |
| C6 | site-localization.md AC-14 | site-header-sheet-switcher.test.ts::mobile LanguageSwitcher closes the sheet | components/site/site-header.tsx, components/site/language-switcher.tsx | P2 | shipped |
| C7 | site-localization.md AC-15 | site-header-switcher.test.ts::site header renders LanguageSwitcher in desktop actions and mobile sheet | components/site/site-header.tsx | P3 | shipped |
| AC-9 | site-localization.md AC-9 | — | — | P3 | manual-uat |

## Run metrics

Run: 2026-09-08 → 2026-09-08 · plan: res-61_guest_i18n_followups
Criteria: 7 shipped · 1 manual-uat · 8 total
Phases delegated: 19 (7 red, 5 green, 7 refactor; C3-green and C7-green skipped as already-GREEN)
Back-loops: C3: 2 extra Red cycles (infra then button locators)
BLOCKED events: 1 — C3: infra (Playwright webServer required Supabase keys; remediable with dummy local JWT, no Docker)
Issues: 0 filed · 0 attached · 26 left on ledger (below floor) — cap 3/run

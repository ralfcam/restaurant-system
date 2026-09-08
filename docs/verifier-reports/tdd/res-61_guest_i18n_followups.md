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

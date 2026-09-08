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

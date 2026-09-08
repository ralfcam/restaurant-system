# Plan: res-61_guest_i18n_followups

FEATURE · linear_issue: RES-61 · owning spec: `docs/specs/site-localization.md`

Operator approved spec ACs 11–16 and strengthening `tests/unit/i18n/site-header-switcher.test.ts` for AC-15.

Read the matching criterion section before each phase. Do not implement other criteria.

## C1 — AC-12 Locale-aware guest header links (P1, unit)

- File: `tests/unit/i18n/site-header-locale-nav.test.ts`
- Name: `header guest links use next-intl Link; staff login stays /admin`
- Assert: `site-header.tsx` imports `Link` from `@/i18n/navigation`; guest hrefs are `/`, `/menu`, `/#reserve` (prefix applied by that Link); staff href remains `"/admin"`; file does not `import Link from "next/link"`.
- Command: `pnpm test:unit tests/unit/i18n/site-header-locale-nav.test.ts`
- Spec excerpt: AC-12 (locale-aware guest header links; `/admin` stays unprefixed per AC-8).

## C2 — AC-11 Header chrome from catalogs (P1, unit)

- File: `tests/unit/i18n/site-header-chrome.test.ts`
- Name: `site header renders nav catalog keys`
- Assert: source has `useTranslations("nav")` (or `useTranslations()` + `t("nav.…")`) and JSX `{t("staffLogin")}`, `{t("bookTable")}`, `{t("menu")}`, `{t("openMenu")}`.
- Command: `pnpm test:unit tests/unit/i18n/site-header-chrome.test.ts`
- Spec excerpt: AC-11.

## C3 — AC-11 rendered FR/EN nav (P1, e2e)

- File: `tests/e2e/localization.spec.ts` (add a new test; do not rewrite existing ones)
- Name: `navbar chrome follows locale catalogs`
- `@p1` · guest · `/` shows `Connexion personnel` and `Réserver une table`; `/en` shows `Staff login` and `Book a table`
- Command: `pnpm exec playwright test tests/e2e/localization.spec.ts --project=chromium`
- Precondition: Playwright `webServer` (`pnpm dev` → `http://localhost:3000`). 0 tests / server-down → BLOCKED (infra).
- Spec excerpt: AC-11 distinguishing FR/EN strings. Depends on C2.

## C4 — AC-13 Localized active nav (P2, unit)

- File: `tests/unit/i18n/localized-pathname.test.ts` (add a new `it`; do not rewrite the existing mapping test)
- Name: `isActiveNavPath matches locale-stripped /menu`
- Assert: helper `isActiveNavPath("/en/menu","/menu")===true`, `("/menu","/menu")===true`, `("/","/menu")===false`, `("/en","/menu")===false`; header uses it for Menu `font-bold`.
- Command: `pnpm test:unit tests/unit/i18n/localized-pathname.test.ts`
- Spec excerpt: AC-13. Depends on C1.

## C5 — AC-16 Document language (P2, unit)

- File: `tests/unit/i18n/document-lang.test.ts`
- Name: `resolveDocumentLang follows public locale and staff English`
- Assert: `/`+`/menu` → `fr`; `/en`+`/en/menu` → `en`; `/admin`, `/pos`, `/kds`, `/auth/login` → `en`; `app/layout.tsx` uses the helper for `<html lang>`.
- Command: `pnpm test:unit tests/unit/i18n/document-lang.test.ts`
- Spec excerpt: AC-16.

## C6 — AC-14 Mobile sheet closes on switch (P2, unit)

- File: `tests/unit/i18n/site-header-sheet-switcher.test.ts`
- Name: `mobile LanguageSwitcher closes the sheet`
- Assert: mobile `<LanguageSwitcher` under `SheetContent` has `onClick`/`onNavigate` that calls `setMobileMenuOpen(false)` (or equivalent).
- Command: `pnpm test:unit tests/unit/i18n/site-header-sheet-switcher.test.ts`
- Spec excerpt: AC-14.

## C7 — AC-15 Dual switcher regions (P3, unit)

- File: `tests/unit/i18n/site-header-switcher.test.ts` — **operator-approved modification**
- Name: `site header renders LanguageSwitcher in desktop actions and mobile sheet`
- Assert: two `<LanguageSwitcher` matches; one in the desktop actions block, one inside `SheetContent`.
- Command: `pnpm test:unit tests/unit/i18n/site-header-switcher.test.ts`
- Spec excerpt: AC-15. Operator approved strengthening this existing file.

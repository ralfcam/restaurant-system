# Findings archive

Resolved or filed items (append-only).

- [x] Session cookie merge may drop Set-Cookie options · `middleware.ts:16-18` · `cookies.getAll()` returns name/value only; httpOnly/secure/maxAge from Supabase refresh may be lost on localize paths · med · (found: REAZED-273)
- [x] `pnpm lint` missing `--max-warnings 0` · `package.json:9` · Spec G-L1 requires warnings fail the gate; current script is `eslint .` only · med · (found: REAZED-272)
- [x] Stale duplicate home route · `app/page.tsx` · Pre-localization flat route may shadow `app/[locale]/page.tsx` at `/` and serve non-i18n chrome · med · (found: REAZED-275)
- [x] Lint regression guard is shallow · `tests/unit/dev-toolchain/lint-toolchain.test.ts` · Test only asserts deps + config file exist; does not verify `pnpm lint` exit 0 · low · (found: REAZED-274)
- [x] Duplicated header: homepage inline header vs site-header · `app/page.tsx:58` / `components/site/site-header.tsx:32` · switcher must be added in two places until unified · med · (found: REAZED-276)
- [x] Single html/body ownership vs non-localized /admin · `app/layout.tsx:56` · root hardcodes `lang="en"`; next-intl localized html lang while keeping admin outside [locale] needs clean resolution · med · (found: REAZED-277)
- [x] typescript.ignoreBuildErrors masks type errors · `next.config.mjs:3` · low · (found: REAZED-278)
- [x] Homepage Chef's picks uses static English MENU_ITEMS · `app/page.tsx:27` · localized featured-dish names/descriptions not sourced from DB · low · (found: REAZED-279)
- [x] `/pos` and `/kds` locale exclusion unspecified · `docs/specs/site-localization.md` vs staffPaths · spec excludes only `/admin/**` and `/api/**`; unclear if locale middleware should skip staff POS/KDS routes too · med · (found: REAZED-280)
- [x] Auth login uses UtensilsCrossed placeholder instead of brand logo · `app/auth/login/page.tsx` · Inconsistent brand mark vs guest header · low · (found: REAZED-281)
- [x] ESLint missing from toolchain · `package.json:9` · `pnpm lint` invoked `eslint .` but eslint was not in devDependencies · high · (found: G-L1/green — resolved in-run)
- [x] Pre-existing typecheck failure · `components/site/reservation-widget.tsx:393` · `asChild` prop rejected by `@base-ui/react` types · med · (found: G-T1/green — resolved in-run)
- [x] Nav links use plain `next/link` instead of locale-aware Link · `components/site/site-header.tsx:57-67,107-114` · EN users on `/en/**` clicking Menu may navigate to unprefixed `/menu` · med · (found: REAZED-282)
- [x] Mobile sheet does not close on language switch · `components/site/site-header.tsx:116-119` · switcher navigates without closing sheet · low · (found: REAZED-283)
- [x] No assertion that session cookies propagate on localize paths · `tests/unit/i18n/middleware-scope.test.ts` · cookie merge logic untested · med · (found: REAZED-284)
- [x] Unit test does not assert desktop + mobile switcher regions separately · `tests/unit/i18n/site-header-switcher.test.ts:18` · regex only checks one `<LanguageSwitcher` · low · (found: REAZED-285)
- [x] `usePathname` active-state may not match localized menu hrefs · `components/site/site-header.tsx:6,63` · on `/en/menu`, active link styling likely wrong · low · (found: REAZED-286)

# Design & patterns

**Status:** Reference  
**Last updated:** 2026-06-27

Catalog of reusable test recipes promoted from shipped `/sdd-to-tdd` runs.

## Unit recipes (promoted from REAZED-…)

| Scenario | Mocks | Reference test |
| --- | --- | --- |
| Shared Next.js `<Image>` props in `lib/` | `as const satisfies Pick<ImageProps, …>`; unit-test `src`/dimensions | `tests/unit/site-chrome.test.ts` |
| Filesystem composition guard (no duplicate chrome / route) | `existsSync` (flat route absent) + `readFileSync` + regex on `app/[locale]/page.tsx` | `tests/unit/site-header.test.ts` → "no stale flat app/page.tsx duplicate; localized homepage delegates to SiteHeader without inline fixed header" |
| Source-structure regression (shared chrome ↔ e2e hooks) | `readFileSync` + regex on component source; assert import and JSX presence for chrome wired to `data-testid` hooks exercised in e2e | `tests/unit/i18n/site-header-switcher.test.ts` → "site header renders LanguageSwitcher in shared navbar" |
| Route visibility helper synced with component | Export `shouldRenderSiteHeader(pathname)` from `lib/`; component calls same helper | `tests/unit/site-header.test.ts` (same test as composition guard — asserts `shouldRenderSiteHeader("/")`) |

## Integration recipes

| Scenario | Helpers | Reference test |
| --- | --- | --- |
| _(none yet)_ | — | — |

Add a row when `tdd-refactor` reports a `Reusable pattern:` worth keeping.

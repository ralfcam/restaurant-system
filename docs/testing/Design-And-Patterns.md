# Design & patterns

**Status:** Reference  
**Last updated:** 2026-08-18

Catalog of reusable test recipes promoted from shipped `/sdd-to-tdd` runs.

## Unit recipes (promoted from REAZED-…)

| Scenario | Mocks | Reference test |
| --- | --- | --- |
| Site chrome config — no bundled mark | `as const satisfies Pick<ImageProps, …>` without `src`; unit-test dimensions, absence of `src`, and template identity (`RESTAURANT.name`, `menu-catalog` rename guard) | `tests/unit/site-chrome.test.ts` |
| Filesystem composition guard (no duplicate chrome / route) | `existsSync` (flat route absent) + `readFileSync` + regex on `app/[locale]/page.tsx` | `tests/unit/site-header.test.ts` → "no stale flat app/page.tsx duplicate; localized homepage delegates to SiteHeader without inline fixed header" |
| Source-structure regression (shared chrome ↔ e2e hooks) | `readFileSync` + regex on component source; assert import and JSX presence for chrome wired to `data-testid` hooks exercised in e2e | `tests/unit/i18n/site-header-switcher.test.ts` → "site header renders LanguageSwitcher in shared navbar" |
| Route visibility helper synced with component | Export `shouldRenderSiteHeader(pathname)` from `lib/`; component calls same helper | `tests/unit/site-header.test.ts` (same test as composition guard — asserts `shouldRenderSiteHeader("/")`) |
| Server Action body limit synced with upload cap | `readFileSync` + regex on `next.config.mjs` for `bodySizeLimit` matching `LOGO_UPLOAD_BODY_SIZE_LIMIT` in `lib/branding.ts` | `tests/unit/branding/schema.test.ts` → "raises the Server Action body limit so a 2MB logo fits as base64" |
| Storage upload retries after missing bucket | Mock `storage.from().upload` to fail once with "Bucket not found", `createBucket` succeeds, second upload succeeds; assert `Uint8Array` payload | `tests/unit/branding/actions.test.ts` → "creates the branding bucket when it is missing, then uploads" |
| MIME alias / empty browser `type` validation | Unit-test `resolveLogoContentType` and `validateLogoUpload` with `image/jpg`, `image/x-png`, and extension-only file names | `tests/unit/branding/validation.test.ts` |
| No bundled static logo in `public/` | `existsSync` on `public/images/logo.png` and `.jpg`; assert absent | `tests/unit/branding/schema.test.ts` → "staff branding page exists and leftover test fixtures are gone" |
| Guest chrome uses `BrandMark`, not `SITE_LOGO.src` | `readFileSync` + regex on `site-header.tsx` and `auth/login/page.tsx`; assert `<BrandMark src={logoUrl}>` and no `SITE_LOGO.src` | `tests/unit/branding/schema.test.ts` → "guest header and login render BrandMark only when a custom url is set" |

## Integration recipes

| Scenario | Helpers | Reference test |
| --- | --- | --- |
| _(none yet)_ | — | — |

Add a row when `tdd-refactor` reports a `Reusable pattern:` worth keeping.

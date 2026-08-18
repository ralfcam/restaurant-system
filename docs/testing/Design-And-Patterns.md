# Design & patterns

**Status:** Reference  
**Last updated:** 2026-08-18

Catalog of reusable test recipes promoted from shipped `/sdd-to-tdd` runs.

## Unit recipes (promoted from REAZED-…)

| Scenario | Mocks | Reference test |
| --- | --- | --- |
| Shared Next.js `<Image>` props in `lib/` | `as const satisfies Pick<ImageProps, …>`; unit-test `src`/dimensions | `tests/unit/site-chrome.test.ts` |
| Filesystem composition guard (no duplicate chrome / route) | `existsSync` (flat route absent) + `readFileSync` + regex on `app/[locale]/page.tsx` | `tests/unit/site-header.test.ts` → "no stale flat app/page.tsx duplicate; localized homepage delegates to SiteHeader without inline fixed header" |
| Source-structure regression (shared chrome ↔ e2e hooks) | `readFileSync` + regex on component source; assert import and JSX presence for chrome wired to `data-testid` hooks exercised in e2e | `tests/unit/i18n/site-header-switcher.test.ts` → "site header renders LanguageSwitcher in shared navbar" |
| Route visibility helper synced with component | Export `shouldRenderSiteHeader(pathname)` from `lib/`; component calls same helper | `tests/unit/site-header.test.ts` (same test as composition guard — asserts `shouldRenderSiteHeader("/")`) |
| Server Action body limit synced with upload cap | `readFileSync` + regex on `next.config.mjs` for `bodySizeLimit` matching `LOGO_UPLOAD_BODY_SIZE_LIMIT` in `lib/branding.ts` | `tests/unit/branding/schema.test.ts` → "raises the Server Action body limit so a 2MB logo fits as base64" |
| Storage upload retries after missing bucket | Mock `storage.from().upload` to fail once with "Bucket not found", `createBucket` succeeds, second upload succeeds; assert `Uint8Array` payload | `tests/unit/branding/actions.test.ts` → "creates the branding bucket when it is missing, then uploads" |
| MIME alias / empty browser `type` validation | Unit-test `resolveLogoContentType` and `validateLogoUpload` with `image/jpg`, `image/x-png`, and extension-only file names | `tests/unit/branding/validation.test.ts` |

## Integration recipes

| Scenario | Helpers | Reference test |
| --- | --- | --- |
| _(none yet)_ | — | — |

Add a row when `tdd-refactor` reports a `Reusable pattern:` worth keeping.

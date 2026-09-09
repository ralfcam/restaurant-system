# TDD log: html_lang_pnpm_pin_70d248bc

## C1

Suggested review order:
- Client document-lang sync (write `html lang` from pathname) `[public-api]`
  - `lib/i18n/document-lang-sync.tsx:1` `"use client"`
  - `lib/i18n/document-lang-sync.tsx:8` `usePathname() ?? "/"`
  - `lib/i18n/document-lang-sync.tsx:10-12` `useLayoutEffect` → `resolveDocumentLang` → `document.documentElement.lang`
- Root layout mount (layout stays a Server Component; first paint still AC-16) `[public-api]`
  - `app/layout.tsx:6` import
  - `app/layout.tsx:83-84` `await headers()` + `resolveDocumentLang` for `<html lang>`
  - `app/layout.tsx:92` `<DocumentLangSync />`

Reusable pattern: Null-rendering layout child: `"use client"` + `usePathname` + `useLayoutEffect` to keep `document.documentElement.lang` in sync when the root layout does not re-render on client navigation.

## C2

Suggested review order:
- G-O1 exact pin contract (lock-in) [public-api]
  - `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts:58` — `it("packageManager equals the shipped pnpm@12.3.4 pin")`
  - `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts:60` — `expect(pkg.packageManager).toBe("pnpm@12.3.4")`
  - `package.json:5` — `"packageManager": "pnpm@12.3.4"` [public-api]
- Overlapping shape guard (kept on purpose; still passes `pnpm@9.0.0` by itself)
  - `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts:20` — `toMatch(/^pnpm@\d+\.\d+\.\d+$/)`

Reusable pattern: Lock-in exact `toBe("pnpm@x.y.z")` beside an existing shape regex; do not delete the regex when the spec tightens to equality.

## Suggested Review Order (collated)

Highest-risk first, grouped by concern.

### [public-api] Client document-lang sync after navigation
- `lib/i18n/document-lang-sync.tsx:1` — `"use client"`
- `lib/i18n/document-lang-sync.tsx:8` — `usePathname() ?? "/"`
- `lib/i18n/document-lang-sync.tsx:10-12` — `useLayoutEffect` → `resolveDocumentLang` → `document.documentElement.lang`
- `app/layout.tsx:6` — import `DocumentLangSync`
- `app/layout.tsx:83-84` — `await headers()` + `resolveDocumentLang` for first-paint `<html lang>` (AC-16)
- `app/layout.tsx:92` — `<DocumentLangSync />`

### [public-api] G-O1 exact `pnpm@12.3.4` pin
- `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts:58` — `it("packageManager equals the shipped pnpm@12.3.4 pin")`
- `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts:60` — `expect(pkg.packageManager).toBe("pnpm@12.3.4")`
- `package.json:5` — `"packageManager": "pnpm@12.3.4"`
- `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts:20` — overlapping shape regex (kept; still accepts `pnpm@9.0.0` alone)

## Traceability (final)

Run: 2026-09-09 · plan: html_lang_pnpm_pin_70d248bc · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | site-localization.md AC-17 | document-lang.test.ts::layout mounts a client document-lang sync from usePathname | lib/i18n/document-lang-sync.tsx, app/layout.tsx | P2 | shipped |
| C2 | dev-toolchain.md G-O1 | pnpm-overrides-toolchain.test.ts::packageManager equals the shipped pnpm@12.3.4 pin | package.json | P3 | shipped |

## Run metrics

Run: 2026-09-09 → 2026-09-09 · plan: html_lang_pnpm_pin_70d248bc
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 5 (C1 red, C1 green, C1 refactor, C2 red, C2 refactor; C2 green skipped — lock-in)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 4 left on ledger (below floor) — cap 3/run



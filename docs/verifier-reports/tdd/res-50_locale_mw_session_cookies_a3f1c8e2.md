# TDD log — res-50_locale_mw_session_cookies_a3f1c8e2

### C1

Suggested review order: Session-cookie merge [security]
- `proxy.ts:16-21` — flatten `getAll()` via rest-spread into `cookies.set(name, value, options)` [security]
- `proxy.ts:10-12` — skip-locale still returns the session response unchanged [auth]
- `lib/supabase/proxy.ts:23-24` — sibling `setAll` nested-`options` shape (do not copy blindly)

Reusable pattern: Copy Next.js `ResponseCookies` with `{ name, value, ...options }` from `getAll()` into `set(name, value, options)`; do not use supabase `setAll`’s nested `options` key and do not copy name/value only.

### C2

Suggested review order: Segment-bounded locale skip [auth]
- `i18n/middleware-scope.ts:14-18` — match only exact prefix or `prefix + "/…"` [auth]
- `proxy.ts:8-12` — composition root uses the helper; skip-locale returns the session response [auth]
- `lib/supabase/proxy.ts:35-36` — staff gate still raw `startsWith` (out of scope; do not change)

Reusable pattern: Path-segment prefix = `pathname === prefix || pathname.startsWith(prefix + "/")`; raw `startsWith(prefix)` treats `/authorship` as `/auth`

## Suggested Review Order (collated)

Highest-risk first.

### Session-cookie merge [security]
- `proxy.ts:16-21` — flatten `getAll()` via rest-spread into `cookies.set(name, value, options)` [security]
- `proxy.ts:10-12` — skip-locale still returns the session response unchanged [auth]
- `lib/supabase/proxy.ts:23-24` — sibling `setAll` nested-`options` shape (do not copy blindly)

### Segment-bounded locale skip [auth]
- `i18n/middleware-scope.ts:14-18` — match only exact prefix or `prefix + "/…"` [auth]
- `proxy.ts:8-12` — composition root uses the helper; skip-locale returns the session response [auth]
- `lib/supabase/proxy.ts:35-36` — staff gate still raw `startsWith` (out of scope; do not change)

## Traceability (final)

Run: 2026-09-09 · plan: res-50_locale_mw_session_cookies_a3f1c8e2 · issue: RES-50

| Criterion | Spec ref     | Test file::name | Source file(s) | Risk | Status  |
| --------- | ------------ | --------------- | -------------- | ---- | ------- |
| C1        | AC-18        | middleware-scope.test.ts::session cookies and Set-Cookie options survive locale merge | proxy.ts | P0 | shipped |
| C2        | AC-19 (+ AC-3 tighten) | middleware-scope.test.ts::locale exclusion is segment-bounded including auth/error through proxy | i18n/middleware-scope.ts | P2 | shipped |

## Run metrics

Run: 2026-09-09 → 2026-09-09 · plan: res-50_locale_mw_session_cookies_a3f1c8e2
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 7 (C1 red/green/refactor; C2 red/green/refactor; C2 red type-pin back-loop)
Back-loops: C2: 1 extra Red (NextResponse mocks for typecheck)
BLOCKED events: none
Issues: 0 filed · 0 attached · 6 left on ledger (1 floor-eligible security med, Cloud create forbidden; 5 below floor) — cap 3/run

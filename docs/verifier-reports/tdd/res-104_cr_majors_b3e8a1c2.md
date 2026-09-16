# TDD log — res-104_cr_majors_b3e8a1c2

### C1

Suggested review order:
- **[booking] live membership predicate**
  - `app/actions/guest-profiles.ts:16` comment
  - `app/actions/guest-profiles.ts:17` `.eq("email_normalized", normalizeGuestEmail(email))`
- **[schema] generated STORED key + index**
  - `supabase/migrations/00000000000000_baseline.sql:96` RES-104 / GP-2 comment
  - `supabase/migrations/00000000000000_baseline.sql:97` `email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED`
  - `supabase/migrations/00000000000000_baseline.sql:112` `ADD COLUMN IF NOT EXISTS` (reset no-op path)
  - `supabase/migrations/00000000000000_baseline.sql:115` `reservations_email_normalized_idx`
- **[security] RES-PRIV — generated column not insertable by guests**
  - `supabase/migrations/00000000000000_baseline.sql:128` server-owned list includes `email_normalized`
  - `supabase/migrations/00000000000000_baseline.sql:144` `GRANT INSERT (… email …)` allowlist unchanged
- **mutator pin (intentionally not migrated)**
  - `app/actions/guest-profiles.ts:34` comment
  - `app/actions/guest-profiles.ts:35` `.eq("email", normalizeGuestEmail(input.email))`

Reusable pattern: PostgREST identity membership = generated STORED `lower(btrim(email))` + btree + `.eq` on that column; do not silently move a sibling mutator onto the generated key while its pin still names `.eq("email")`.

### C2

Suggested review order:
- **[auth] inline Save action**
  - `app/admin/customers/[email]/page.tsx:22` `saveGuestPii`
  - `app/admin/customers/[email]/page.tsx:24` `updateGuestProfilePii({ email, guest_name, phone })`
- **[public-api] name/phone chrome, no email control**
  - `app/admin/customers/[email]/page.tsx:40` `<form action={saveGuestPii}>`
  - `app/admin/customers/[email]/page.tsx:41` Name `htmlFor` / `id="guest_name"`
  - `app/admin/customers/[email]/page.tsx:50` Phone `htmlFor` / `id="phone"`
  - `app/admin/customers/[email]/page.tsx:59` `\bSave\b` submit
- **intentional hollow display (C3–C5)**
  - `app/admin/customers/[email]/page.tsx:38` comment
  - `app/admin/customers/[email]/page.tsx:39` `profile.error ?? email`

Reusable pattern: Keep the GP-10 `updateGuestProfilePii({ email, guest_name, phone })` call compact (≤400-char source window); put a11y `htmlFor`/`id`/`autoComplete` on the chrome, not inside the call. Do not import `@/components/ui/*` into a chrome-source pin that concatenates `@/components/` (except `staff-shell`) — a primitive with `type="email"` would fail the no-email-control assertion.

### C3

Suggested review order:
- **[public-api] GP-4 payload display (read-only email/notes)**
  - `app/admin/customers/[email]/page.tsx:40` Email caption
  - `app/admin/customers/[email]/page.tsx:41` `{profile.email}`
  - `app/admin/customers/[email]/page.tsx:45` `{profile.notes}`
- **[public-api] newest-row name/phone on Save inputs**
  - `app/admin/customers/[email]/page.tsx:54` `defaultValue={profile.guest_name ?? ""}`
  - `app/admin/customers/[email]/page.tsx:64` `defaultValue={profile.phone ?? ""}`
- **[auth] GP-10 Save pin (unchanged window)**
  - `app/admin/customers/[email]/page.tsx:22` `saveGuestPii`
  - `app/admin/customers/[email]/page.tsx:24` `updateGuestProfilePii({ email, guest_name, phone })`
  - `app/admin/customers/[email]/page.tsx:68` `\bSave\b`
- **[security] no editable email control** — no `type="email"` / `name="email"` on the page

Reusable pattern: GP-4 read-only PII uses the same label-grid rhythm as GP-10 inputs but interpolates `profile.email` / `profile.notes` as text (never `type="email"`); keep the `updateGuestProfilePii(` call ≤400 chars so the C2 window pin stays green.

### C4

Suggested review order:
- **[public-api] GP-5 history columns**
  - `app/admin/customers/[email]/page.tsx:70` history `<ul>`
  - `app/admin/customers/[email]/page.tsx:71` `profile.history?.map` [public-api]
  - `app/admin/customers/[email]/page.tsx:73` index-prefixed composite key
  - `app/admin/customers/[email]/page.tsx:75` `{row.date} {row.time} {row.party_size} {row.status}` [public-api]
- **[public-api] GP-4 PII (unchanged; C3 pin)**
  - `app/admin/customers/[email]/page.tsx:41` `{profile.email}`
  - `app/admin/customers/[email]/page.tsx:45` `{profile.notes}`
  - `app/admin/customers/[email]/page.tsx:54` `defaultValue={profile.guest_name ?? ""}`
  - `app/admin/customers/[email]/page.tsx:64` `defaultValue={profile.phone ?? ""}`
- **[auth] GP-10 Save (unchanged; C2 pin)**
  - `app/admin/customers/[email]/page.tsx:22` `saveGuestPii` [auth]
  - `app/admin/customers/[email]/page.tsx:24` `updateGuestProfilePii({ email, guest_name, phone })`

Reusable pattern: When the declared history type has no `id`, prefix the composite date-time-party-status React key with `map` index so same-slot rows stay unique; keep `.date` `.time` `.party_size` `.status` inside the 800-char `history?.map` window.

### C5

Suggested review order:
- **[public-api] GP-12 exclusive empty vs history**
  - `app/admin/customers/[email]/page.tsx:70` `!profile.history?.length`
  - `app/admin/customers/[email]/page.tsx:71` `No reservations — not found.`
  - `app/admin/customers/[email]/page.tsx:73` history `<ul>` only in the else [public-api]
  - `app/admin/customers/[email]/page.tsx:74` `profile.history?.map` [public-api]
- **[public-api] GP-5 columns (unchanged; C4 pin)**
  - `app/admin/customers/[email]/page.tsx:76` index-prefixed composite key
  - `app/admin/customers/[email]/page.tsx:78` `{row.date} {row.time} {row.party_size} {row.status}`
- **[auth] GP-10 Save (unchanged; C2 pin)**
  - `app/admin/customers/[email]/page.tsx:22` `saveGuestPii` [auth]
  - `app/admin/customers/[email]/page.tsx:24` `updateGuestProfilePii({ email, guest_name, phone })`

Reusable pattern: GP-12 empty chrome is an exclusive ternary (`!history?.length ? emptyCopy : <ul>{history?.map}</ul>`), not a sibling empty `<p>` plus vacant `<ul>` — keep both source pins (`length` + `map`) in the same file; do not extract `hasHistory`.

### C6

Suggested review order:
- **[public-api] per-row ficha Link**
  - `components/staff/reservations-manager.tsx:346` `const fichaHref = guestProfileHref(r.email)`
  - `components/staff/reservations-manager.tsx:360` `{fichaHref ? (`
  - `components/staff/reservations-manager.tsx:361` `<Link` **[public-api]**
  - `components/staff/reservations-manager.tsx:362` `href={fichaHref}` **[public-api]**
  - `components/staff/reservations-manager.tsx:365` `Guest profile`
- **email on the UI row**
  - `components/staff/reservations-manager.tsx:45` `email: string | null`
  - `components/staff/reservations-manager.tsx:60` `email: r.email ?? null`
- **href helper (unchanged)**
  - `lib/guest-profiles.ts:5` `guestProfileHref`
  - `lib/guest-profiles.ts:6` `normalizeGuestEmail` → null on blank

Reusable pattern: Already-green GP-9 chrome: keep `const fichaHref = guestProfileHref(r.email)` + ternary `<Link href={fichaHref}>` / `: null`; do not extract a helper or switch to `&&` — the C6 source pin and React conditional-render both require that shape.

## Suggested Review Order (collated)

Highest-risk first.

- [booking] Live membership predicate — `app/actions/guest-profiles.ts:17` `.eq("email_normalized", normalizeGuestEmail(email))`
- [schema] Generated STORED key + index — `supabase/migrations/00000000000000_baseline.sql:97` `email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED`; `:115` `reservations_email_normalized_idx`
- [security] RES-PRIV — generated column not on guest INSERT — `supabase/migrations/00000000000000_baseline.sql:128` server-owned list; `:144` `GRANT INSERT` allowlist unchanged
- [auth] Ficha Save — `app/admin/customers/[email]/page.tsx:22` `saveGuestPii`; `:24` `updateGuestProfilePii({ email, guest_name, phone })`
- [public-api] Displayed PII — `app/admin/customers/[email]/page.tsx:41` `{profile.email}`; `:45` `{profile.notes}`; `:54` / `:64` `defaultValue={profile.guest_name|phone}`
- [public-api] History vs empty — `app/admin/customers/[email]/page.tsx:70` `!profile.history?.length`; `:71` not-found copy; `:74` `profile.history?.map`; `:78` date/time/party_size/status
- [public-api] Reservation-row Link — `components/staff/reservations-manager.tsx:346` `guestProfileHref(r.email)`; `:362` `href={fichaHref}`
- Mutator still exact stored email — `app/actions/guest-profiles.ts:35` `.eq("email", normalizeGuestEmail(input.email))`

## Traceability (final)

Run: 2026-09-16 · plan: res-104_cr_majors_b3e8a1c2 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profiles.md GP-2 | live-read.test.ts::getGuestProfile includes reservations that differ only by case or padding | app/actions/guest-profiles.ts, supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C2 | guest-profiles.md GP-10 | staff-gate.test.ts::staff ficha save control writes name and phone and not email | app/admin/customers/[email]/page.tsx | P0 | shipped |
| C3 | guest-profiles.md GP-4 | staff-gate.test.ts::staff ficha displays guest_name email phone notes | app/admin/customers/[email]/page.tsx | P1 | shipped |
| C4 | guest-profiles.md GP-5 | staff-gate.test.ts::staff ficha lists date time party_size status | app/admin/customers/[email]/page.tsx | P1 | shipped |
| C5 | guest-profiles.md GP-12 | staff-gate.test.ts::staff ficha empty key is empty not other guests | app/admin/customers/[email]/page.tsx | P1 | shipped |
| C6 | guest-profiles.md GP-9 | reservation-entry.test.ts::reservations list renders a ficha link for non-blank email only | components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: res-104_cr_majors_b3e8a1c2
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 18
Back-loops: C1: 1 extra Green (hollow `.filter("trim(lower(email))")` rejected; generated `email_normalized` accepted)
BLOCKED events: none
Issues: 0 filed · 2 attached-to-existing · 306 left on ledger (below floor/Cloud no-create) — cap 3/run

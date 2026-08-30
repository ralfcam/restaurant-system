# TDD verifier report — mailing automations (`mailing_automations_triple_2347e1d5.plan`)

FIX + FEATURE run. Linear: [REAZED-319](https://linear.app/realized/issue/REAZED-319), [REAZED-320](https://linear.app/realized/issue/REAZED-320), [REAZED-321](https://linear.app/realized/issue/REAZED-321).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — PV-9 server-only boundary

Suggested review order:
- [security] compile-time client-import barrier — `lib/marketing/review-email.ts:1`
- [security] processor stays a lib export, not a Server Action — `lib/marketing/review-email.ts:64` (`export async function processDueReviewEmails`; no `"use server"` in file)
- [auth] cron Bearer still gates send before the processor runs — `app/api/cron/review-email/route.ts:6-8` then `:11-17`
- test pin (source-read, not the mocked module graph) — `tests/unit/marketing/review-email-job-auth.test.ts:42-50`
- unit harness so Vitest can load `server-only` — `tests/unit/setup.ts:3`

Reusable pattern: Pin PV-9 with a source-read test (`/^import ["']server-only["']/` + no file-level `"use server"`) and a global `vi.mock("server-only", () => ({}))` in unit setup; never put `"use server"` on a cron-Bearer-authenticated processor.

### C2 — PV-6 overlapping processDue

Suggested review order:
- exclusive claim before send **[booking]**: `lib/marketing/review-email.ts:131` CAS `.update({ sent_at }).eq(reservation_id).is("sent_at", null).select("reservation_id")`
- lost-claim skip **[booking]**: `lib/marketing/review-email.ts:139` `claimError` log + continue; `lib/marketing/review-email.ts:146` empty `claimed` continue (no mailer)
- send then release-on-throw **[booking]**: `lib/marketing/review-email.ts:148` `mailer.send`; `lib/marketing/review-email.ts:154` `sent_at: null` then rethrow
- unsent scan (unchanged): `lib/marketing/review-email.ts:103` `.is("sent_at", null)`
- PV-8 write surface: only `review_email_sends` at `:137` (claim) and `:156` (release)

Reusable pattern: PV-6 claim-before-send — CAS with `.update().is("sent_at", null).select()`; treat error or empty `data` as lost claim (do not read `count` unless `{ count: "exact" }` is passed); release `sent_at` on mailer throw.

### C3 — BW-13 required email, optional phone

Suggested review order:
- runtime-required trimmed email **[public-api]**: `lib/reservations/validation.ts:90` (`email?.trim()`), `:91-93` (`!email || !EMAIL_RE`)
- EMAIL_RE shape **[public-api]**: `lib/reservations/validation.ts:22-23`
- blank phone skips PHONE_RE **[booking]**: `lib/reservations/validation.ts:85-88` (`if (phone && !PHONE_RE)`)
- C4 type seam: `lib/reservations/validation.ts:33` (`email?: string` still optional so `createReservation` typechecks)
- unit pins: `tests/unit/reservations/validation.test.ts:175-180` (empty phone), `:206-210` (non-blank invalid phone), `:213-233` (missing/invalid email; valid email + blank phone)

Reusable pattern: BW-13 email/phone — `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` after trim; reject with `!email || !EMAIL_RE`; invert phone to `if (phone && !PHONE_RE)` so blank/whitespace skips the pattern. Do not RFC-ify the regex.

### C4 — Persist email on insert

Suggested review order:
- [booking] persist trimmed email + blank phone as `""` — `app/actions/reservations.ts:130-139`
- [security] no `.select()` after insert (AC-5 / anon INSERT-only) — `app/actions/reservations.ts:124-130`
- [public-api] action argument is `ReservationPayload` (`email?` still optional) — `app/actions/reservations.ts:74-76`; `lib/reservations/validation.ts:27-35`
- persist pin — `tests/unit/reservations/create-reservation.test.ts:64-85`

Reusable pattern: Point the `"use server"` booking action at `ReservationPayload` via `import type` so insert columns and the validator share one shape; leave `email?` until the widget call site ships so typecheck stays green.

### C5 — Widget pass-through

Suggested review order:
- [public-api] `confirm()` passes `email` into `createReservation` — `components/site/reservation-widget.tsx:456`
- [public-api] Email `#res-email` is `required` — `components/site/reservation-widget.tsx:978`
- [booking] Phone `#res-phone` is not `required` — `components/site/reservation-widget.tsx:961`
- Email label has no `(optional)` — `components/site/reservation-widget.tsx:972`
- [public-api] `ReservationPayload.email` is now required at the TS boundary — `lib/reservations/validation.ts:33`
- Runtime still treats omitted email as a reservation error (`?.trim()`) — `lib/reservations/validation.ts:90`
- Source-read pin — `tests/unit/reservation-widget/guest-email.test.ts:16`

Reusable pattern: Once the widget `confirm()` call site passes `email`, tighten `ReservationPayload.email` to required; keep `payload.email?.trim()` in the validator so a runtime-omitted field is still a reservation error, not a throw.

### C6 — Confirmation send after insert

Suggested review order:
- Server-only helper, not a Server Action `[security]`
  - `lib/marketing/booking-confirmation.ts:1` (`import "server-only"`)
  - `lib/marketing/booking-confirmation.ts:3` (`sendBookingConfirmation` export; no `"use server"`)
- Send only after INSERT success; throw must not withhold `confCode` `[booking]`
  - `app/actions/reservations.ts:147` (`if (!error)`)
  - `app/actions/reservations.ts:150-162` (try send / catch / `return { confCode }`)
- In-memory payload; no `mailer` on the public action `[public-api]` `[security]`
  - `app/actions/reservations.ts:116-119` (trimmed locals)
  - `app/actions/reservations.ts:136-145` (insert includes `email`, no `.select()`)
  - `app/actions/reservations.ts:151-158` (helper args: email, confCode, booking fields)
- Throwing stub + BW-14 `{ to, html }` shape (body still empty)
  - `lib/marketing/booking-confirmation.ts:13-21`

Reusable pattern: Inject a throwing `{ send }` stub inside a `server-only` helper and catch at the Server Action; type the stub as `{ send: (payload?: unknown) => unknown }` so `{ to, html }` typechecks without an unused `_payload` (`eslint-config-next` does not ignore that name).

### C7 — Confirmation HTML

Suggested review order:
- XSS entity order **[security]** — `lib/marketing/booking-confirmation.ts:3` (`&` first, then `<` `>` `"` `'`)
- Server-only helper, not a Server Action **[security]** — `lib/marketing/booking-confirmation.ts:1` (`import "server-only"`); `:21` (`export async function sendBookingConfirmation`; no `"use server"`)
- BW-14 payload `{ to, html }` (no From/subject) **[public-api]** — `lib/marketing/booking-confirmation.ts:42`
- Escaped field dump (name, date, time, party, conf_code) **[booking]** — `lib/marketing/booking-confirmation.ts:39`
- Injected mailer + throwing stub — `lib/marketing/booking-confirmation.ts:13` (`ConfirmationMailer`); `:15` (`unconfiguredMailer`); `:37`
- C7 pin — `tests/unit/marketing/booking-confirmation.test.ts:47` (`to` + escaped name + date/time/party/conf)

Reusable pattern: Keep a local `&`-first `escapeHtml` in each mailer module; assemble BW-14 html with `[name, date, time, party, conf].map(escapeHtml).join(" ")`; type the injected stub as `{ send: (payload?: unknown) => unknown }` and hoist the unconfigured thrower so `{ to, html }` typechecks without `_payload`. Do not extract a shared html util until a third caller exists.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Server-only send paths `[security]` `[auth]`

- Compile-time client-import barrier — `lib/marketing/review-email.ts:1` (`import "server-only"`)
- Processor is a lib export, not a Server Action — `processDueReviewEmails`; no `"use server"`
- Cron Bearer still gates send — `app/api/cron/review-email/route.ts`
- Confirmation helper is also `server-only`, not `"use server"` — `lib/marketing/booking-confirmation.ts:1` / `:21`
- Unit harness — `tests/unit/setup.ts:3` (`vi.mock("server-only")`)
- Source-read pin — `tests/unit/marketing/review-email-job-auth.test.ts` (`processor module imports server-only and is not a use-server file`)

### 2. Claim-before-send and booking confirmation `[booking]`

- Exclusive claim before mailer — `processDueReviewEmails` CAS `.update({ sent_at }).is("sent_at", null).select()`
- Lost-claim skip (no mailer) — empty `claimed` / `claimError` continue
- Release `sent_at` on mailer throw, then rethrow
- `createReservation` insert includes trimmed `email`; blank phone as `""`; no `.select()` after insert (AC-5)
- Send confirmation only after INSERT success; catch throw; still `{ confCode }`
- HTML `{ to, html }` with `&`-first escape of name/date/time/party/`conf_code`

### 3. Guest intake contract `[public-api]`

- Runtime-required trimmed email + `EMAIL_RE` (`local@domain` with `.` in domain) — `lib/reservations/validation.ts`
- Blank phone skips `PHONE_RE`; non-blank still matches
- `ReservationPayload.email` required at the TS boundary
- Widget: `confirm()` passes `email`; Email `required`; Phone not `required`; no `(optional)` on Email

### 4. Tests `[test]`

- Overlapping-scan mock — `review-email-send.test.ts` (`overlapping processDue invocations send at most once for the same reservation`)
- Validation `basePayload` email + inverted empty phone — `validation.test.ts`
- Persist + send-after-insert — `create-reservation.test.ts`
- Widget source pin — `guest-email.test.ts`
- Confirmation HTML — `booking-confirmation.test.ts`

## Traceability (final)

Run: 2026-08-30 · plan: mailing_automations_triple_2347e1d5.plan · issues: REAZED-319, REAZED-320, REAZED-321

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | post-visit-review-email.md PV-9 | review-email-job-auth.test.ts::processor module imports server-only and is not a use-server file | lib/marketing/review-email.ts, tests/unit/setup.ts | P0 | shipped |
| C2 | post-visit-review-email.md PV-6 | review-email-send.test.ts::overlapping processDue invocations send at most once for the same reservation | lib/marketing/review-email.ts processDueReviewEmails | P0 | shipped |
| C3 | booking-rules.md BW-13 | validation.test.ts::rejects a missing email (plus siblings) | lib/reservations/validation.ts | P1 | shipped |
| C4 | booking-rules.md BW-13 persist | create-reservation.test.ts::successful insert includes trimmed guest email | app/actions/reservations.ts createReservation | P1 | shipped |
| C5 | booking-rules.md BW-7 / BW-13 widget | guest-email.test.ts::confirm passes email and Email is required while Phone is not | components/site/reservation-widget.tsx | P1 | shipped |
| C6 | booking-rules.md BW-14 send | create-reservation.test.ts::calls confirmation send after a successful insert with the guest email and conf_code | app/actions/reservations.ts, lib/marketing/booking-confirmation.ts | P1 | shipped |
| C7 | booking-rules.md BW-14 body | booking-confirmation.test.ts::confirmation html includes escaped name date time party and conf_code | lib/marketing/booking-confirmation.ts | P2 | shipped |
| live-provider-delivery | post-visit-review-email.md / booking-rules.md BW-14 | — | throwing stub class | P3 | manual-uat |

## Run metrics

Run: 2026-08-30 → 2026-08-30 · plan: mailing_automations_triple_2347e1d5.plan
Criteria: 7 shipped · 1 manual-uat · 8 total
Phases delegated: 22 tdd-red/green/refactor Task calls
Back-loops: C7: 1 extra Green (optional-mailer stub after Red BLOCKED on throw-before-html)
BLOCKED events: 1 — C7: helper throw before html observable; optional-mailer stub unblocked right-reason RED
Issues: 1 filed (REAZED-322 service.ts server-only, relatedTo REAZED-319) · 0 attached · 28 this-run left on ledger (below floor) · spec Implementation traces still stale (`docs/specs/**` write blocked at docs-updater / close-out)

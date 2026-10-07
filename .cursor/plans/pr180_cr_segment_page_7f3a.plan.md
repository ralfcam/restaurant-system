# pr180_cr_segment_page_7f3a

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. In-loop CodeRabbit fix
`loc-180-7f3a` on PR #180. Stay on `cursor/res-86-88f7`. Skip START and
CLOSE-OUT.

- Your only direct writes are the spec edit listed in Permissions Requested,
  the findings run file, and the tdd log close-out sections. Tests come from
  `tdd-red`. Source comes from `tdd-green`. Cleanup comes from `tdd-refactor`.
- One Task call per phase. Never pass `model` on those Task calls.
- Do not edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- After close-out, format dirty paths, run the advisory CodeRabbit gate, then
  commit.md and, on PASS, push.md. Never `gh pr ready`. Never `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Workflow mode: FIX
- linear_issue: none (in-loop). Related context RES-86 / PR #180.
- local-ref: `loc-180-7f3a`
- Inert finding id: `cr-comment:v1:77b39811245ab37f561c5a59`
- Inert path: `app/actions/guest-profiles.ts`
- Inert severity: unknown (adapter). Comment text labeled the issue Major.

## Issue & Root Cause

- Observed: `listGuestSegments` selects reservation columns once and does not
  order or range. `supabase/config.toml` sets `max_rows = 1000`. PostgREST
  returns the first page with no error.
- Expected: GS-2 and GS-6 return every non-blank normalized email, including a
  guest whose only reservation is past the first 1000 rows.
- Sibling: `readAllGuestMergeRows` in `app/actions/guest-profiles.ts` orders by
  `id` and pages with `.range` of `POSTGREST_MAX_ROWS` until a short page.
  `tests/unit/guest-profiles/merge.test.ts` pins the 1001st row.
- Hypothesis: the segment read never pages, so GS-6 is vacuously true on the
  first page only.
- Missing spec rule: the service-role list read must order by `id` and page.

## Permissions Requested

- `docs/specs/guest-segmentation.md` — add the paging rule to the scope read
  sentence and to GS-6.

## Spec edit (execute before Red)

In `docs/specs/guest-segmentation.md` Scope, replace the service-role sentence
so it also says the read orders `reservations` by `id` ascending and requests
pages of 1000 with `.range` until a page returns fewer than 1000 rows.

In GS-6, add: a guest whose only reservation is past the first 1000 rows is
still included when filters are clear.

## Contract

One new test in `tests/unit/guest-profiles/segmentation.test.ts`. Do not edit
the other tests in that file. Do not edit `messages/**`, `components/**`, or
`supabase/**`.

The mock must cap an unpaginated select at 1000 rows and cap each `.range`
page at 1000. One thousand filler reservations, then one later reservation
for `late@ex.com`. With no filters, `listGuestSegments` includes
`late@ex.com`. Today's unpaged select fails that assertion.

Green pages inside `listGuestSegments` only. Select stays
`email, guest_name, phone, status, date, time`. Order `id` ascending. Range
`start` through `start + 999` until a short page. A page error still logs
`[guest-profiles] listGuestSegments:` and returns
`errors.guestProfiles.unmapped`. Do not change `readAllGuestMergeRows`.
Do not add a shared pager.

## TDD Execution Loop

### GS-6 — guest past the first page

- **GS-6-red:** Invoke the `tdd-red` subagent to add the failing test
  "a guest past the first 1000 reservation rows is still listed when filters are clear"
  in `tests/unit/guest-profiles/segmentation.test.ts`.
- **GS-6-green:** Invoke the `tdd-green` subagent to page `listGuestSegments`
  until that test passes and the existing guest-profiles unit file still passes.
- **GS-6-refactor:** Invoke the `tdd-refactor` subagent to clean the paging
  loop without a new abstraction, then re-run the guest-profiles unit file,
  lint, and typecheck.

## Out of scope

The filter form has no submit control and does not echo the active query.
That item is already the open ledger line in `docs/findings/product-gaps.md`
("Guest segment form cannot apply or clear"). Do not fix it here.

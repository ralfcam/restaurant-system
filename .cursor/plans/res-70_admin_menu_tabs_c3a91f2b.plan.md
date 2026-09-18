# RES-70 — Allow admins to add, rename, and reorder menu tabs

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/<plan-slug>.plan.md` (repository work-order, not a
  silently accepted native Cursor Plan). After a spec or living-findings
  (`docs/findings/<category>.md`) write, `pnpm exec prettier --write` **that
  file** (never `prettier --write .`). Snapshot trees (`docs/eval`,
  `docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. Run them
  sequentially, one **phase** at a time (not one criterion at a time), honoring
  each phase's exit condition before the next Task call.
- **Do not mark a phase done on subagent assertion alone**
  ([.cursor/rules/verification-before-completion.mdc](.cursor/rules/verification-before-completion.mdc)).
  A phase's "GREEN ✓" / "RED ✓" report is that subagent's claim; before
  advancing to the next Task call, the phase's own exit condition (the target
  test's actual pass/fail status) must be visible in the returned report — not
  assumed from a prior phase or from memory.
- **One Task call per phase.** Each todo is a single phase delegation; do not
  satisfy a bundled "drive criterion X" todo by doing Red+Green+Refactor in one
  turn, and do not treat a "same as the previous criterion" note as license to
  self-implement. If a phase lacks its own explicit entry, STOP and ask rather
  than improvising it inline.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`. Agent frontmatter owns the model; do not
  copy the parent chat's model into Task. Omitting `model` lets the pin apply;
  passing it overrides the pin and is forbidden unless the operator explicitly
  requested that model for this run.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself. If you are about to, STOP and issue the
  matching `Use the <agent> subagent to …` Task call instead.
  **Exception (mechanical only):** after close-out (docs-updater + 4C) and before
  STEP 4F, you MAY run `pnpm exec prettier --write` via Shell on
  paths already dirty from this run (`git status --porcelain`). Never
  `prettier --write .`. This is not a substitute for `tdd-*` implementation
  writes.
- Docs sync = `docs-updater` (background). **Wait for its report in-thread**
  before 4C. After 4C/4B, run the format pass, then STEP 4G, then STEP 4F. Linear
  START (one bounded `Work started:` summary comment on the invoked issue —
  no In Progress/In Review/Done write), close-out (resolution comment only), AND
  out-of-scope finding registration = `linear-resolver`. Do not do their work
  inline. START is the first execution Task when a tracked issue exists, invoked
  with `run_in_background: true`. Do **not** wait for START before spec edits or
  Criterion 1 Red. A later `## Linear — BLOCKED` is visibility-only. Non-blocking
  does not make the summary comment optional. A solo `start-linear` todo
  launches only START (nothing else to continue).
- **Clarification is a separate stop path.** Before START/spec/Red, an
  unresolved tracked route/spec decision emits and executes only the approved
  `clarify-<RES-id>` `linear-resolver` CLARIFY todo. The resolver may use only
  `list_comments` and `save_comment`; no state/scope write is allowed. Stop
  after the comment result and wait for a later human answer plus command
  re-run. A clarification comment is a Slack visibility trigger only, never an
  In Review/Done trigger.
- **START before the loop (launch, do not wait).** When STEP 2B applies (FIX
  Linear ID/URL, or FEATURE `linear_issue` set), the first Task call on
  execution is `linear-resolver` START (`run_in_background: true`) on the
  invoked issue: post the filled-in `## Linear Plan Digest` as the single
  `Work started:` summary comment. Do **not** wait, poll, or `AwaitShell` for that
  Task. Then — if further todos were assigned — the approved spec edit (FIX) or
  Criterion 1 Red immediately. Only BLOCKED or no tracked issue exempts the
  summary comment (the background agent still reports BLOCKED; the
  orchestrator does not wait to learn it). A stale `start-linear` todo
  **cannot override STEP 2B**: if it waits for START, ends the turn, or lacks
  `run_in_background: true`, ignore that wait/stop wording and follow this
  bullet.
- **Close-out sequence (mandatory):** 4D → 4E → Docs sync packet → Step 4
  (docs-updater) → 4C → 4B (FIX) → **format pass** (`pnpm exec prettier --write`
  on this run's dirty paths from `git status --porcelain`; never `.`) → **STEP 4G
  (mandatory advisory local CodeRabbit attempt; ignored audit receipt; do not write the
  receipt into the tdd log)** → then
  STEP 4F (**local:** point to `/commit`; **managed Cloud:** execute
  `.cursor/commands/commit.md`, and on PASS execute
  `.cursor/commands/push.md`). After each Refactor phase, append that
  criterion's `Suggested review order:` and `Reusable pattern:` lines to
  `docs/verifier-reports/tdd/<plan-slug>.md` (Step 3). At close-out: collate
  **`## Suggested Review Order (collated)`** into the tdd log (4D); append
  **`## Traceability (final)`** (4E); assemble the **Docs sync packet**; delegate
  `docs-updater` with the packet (Step 4). Pattern promotion and Implementation
  trace mirror happen via docs-updater from the packet. The Refactor
  `## Residual findings` block is an **adversarial** pass — treat a bare "none"
  as suspect, not as a clean bill.
- **Out-of-scope findings are tracked in the run file, merged to the bus at
  close-out, never dropped or chased.** Do not expand a criterion to fix an
  incidental discovery. Every phase report ends with a `[category]`-tagged
  `## Residual findings` block; **immediately after each phase returns, run a
  revision pass on `docs/findings/runs/<plan-slug>.md`** (matching `## <category>`
  section) before the next Task call — never carry findings only in memory. The
  pass reconciles, it doesn't blind-append: remove entries this phase resolved
  in-run, dedupe/sharpen existing ones, append only genuinely new out-of-scope
  items that no later criterion handles, and drop process notes. At close-out,
  **merge** the run file's open lines into the matching `docs/findings/<category>.md`
  (dedupe/sharpen), delegate `linear-resolver` to read the (already-curated)
  `docs/findings/*.md` (plus the plan's Out-of-Scope Findings table), file the
  findings as linked Linear issues (your confirmation gates creation — managed
  Cloud does not auto-confirm net-new finding issues; persist to the ledger and
  STOP), then
  **prune** each registered entry into `docs/findings/archive.md` with its issue
  id and **truncate/delete the run file**. If Linear is unavailable, the merged
  category files ARE the fallback backlog.
- **A skipped test is not progress** (see
  [.cursor/rules/test-execution-integrity.mdc](.cursor/rules/test-execution-integrity.mdc)).
  No phase advances on a test that did not execute — that is a BLOCKER, never a
  Red/Green/Refactor pass. Ensure local Supabase is up and seeded
  (`npx supabase start && npx supabase db reset --local`) before the loop and
  run integration phases with `pnpm test:integration` (fail-closed). For e2e phases,
  ensure the local app + seed/storage-state are ready and run
  `pnpm exec playwright test <path> --project=chromium-desktop` (or
  `pnpm test:e2e:chromium <path>`). If a phase returns `BLOCKED (infra)`, STOP
  and report the remedy.
- If you cannot delegate (Task tool unavailable in this mode), STOP and report —
  do not self-implement. Managed Cloud one-shot does not waive this STOP.
- **Managed Cloud one-shot:** after the work-order exists at
  `.cursor/plans/<plan-slug>.plan.md`, execute immediately. Do not wait for a
  second plan accept. Do not auto-confirm new Linear finding issues. After a
  successful close-out (format pass complete; START BLOCKED remains
  visibility-only), execute `.cursor/commands/commit.md`; on PASS execute
  `.cursor/commands/push.md`. Cloud one-shot does not waive evidence,
  clarification, infra, delegation, phase-exit, write-scope, verification,
  CHANGES-REQUESTED, or `/push` safety STOPs. Never `gh pr ready`. Never
  `gh pr merge`.
- If the delegation-guard hook is installed, arm it as your FIRST execution
  action (`node .cursor/hooks/tdd-guard.mjs on`) and disarm it as your LAST
  (`node .cursor/hooks/tdd-guard.mjs off`). Before each phase's Task call, set
  the active phase (`node .cursor/hooks/tdd-guard.mjs phase red|green|refactor`)
  so the guard enforces that phase's write scope on the subagent — Red confined
  to `tests/**`, Green/Refactor blocked from touching `tests/**`; clear it
  (`phase clear`) once the criterion's Refactor exits green.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-70_admin_menu_tabs_c3a91f2b.plan.md`
- Workflow mode: FIX
- linear_issue: RES-70

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; teamId `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, status Planned / nonterminal, `versionKey` `V-0.2`). Discovery set: V-0.2 planned, V-0.5 backlog, V-0.1 completed excluded. No duplicate keys. Allocation precedence #2: issue already on this project.
- Work type: implementation (product-gap FIX: encode Linear ACs into the owning spec, then TDD)
- Milestone: M4 — Code Complete (Feature Freeze). Issue currently sits on M2 — Requirements Sign-Off because the ACs lived only on the Linear card; they are now testable. This run does not move the Linear milestone (`save_issue` forbidden). `/dispatch` owns any later M2→M4 field write.
- Mixed design + implementation: no — Linear RES-70 already states independently testable ACs; this run copies them into `menu-availability.md` then implements. POS remains on compiled `MENUS` (AC-4), recorded as an out-of-scope finding.
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: **RES-70** — Observed: `/admin/menu` tabs are the compiled `MENUS` / `MenuId` union (`midi|soir|boissons|blanc|rouge` from `lib/menu-catalog.ts`). Admins cannot create, rename, or reorder tabs; guest `/[locale]/menu` and the dish selector share that seed. Expected: staff-managed tabs persist across reload, appear in dish create/edit, and drive guest tab names and order; rename/reorder must not re-key existing `menu_items.menu_id`.
- Missing constraint (root cause): `docs/specs/menu-availability.md` has no admin-tab ACs. AC-4 explicitly keeps `MENUS` / `MenuId` for POS tabs and never requires a durable `menus` catalog for staff or guest.
- Spec update proposed: `docs/specs/menu-availability.md` → add **MT-1–MT-9** and one clarifying sentence on AC-4 that POS picker tabs may remain compiled while admin/guest catalogs are live. FIRST execution write after START.

**Evidence (STEP 1B):**

- Linear RES-70 (Feature, product-gap, ux, High). Slack attachment lists the same ACs. Comments: agent-session thread + GitHub sync only — no human design answer pending.
- `lib/menu-catalog.ts:3,142-145` — `MenuId` is a five-value union; `MENUS` is built from `menu-catalog.json`.
- `components/staff/menu-manager.tsx:14,47,276,541` — filter tabs and dish `<Select>` map `MENUS`.
- `components/site/menu-browser.tsx:6,38-53` — guest tabs from `MENUS`; empty tabs hidden via `populatedMenus`.
- `components/staff/pos-terminal.tsx:6,32,95` — POS tabs from `MENUS` (AC-4; out of scope this run).
- `supabase/migrations/00000000000000_baseline.sql:168` — `menu_items.menu_id TEXT NOT NULL`; no `menus` table.
- Sibling that works: staff item CRUD already uses `requireStaffUser` + `createServiceClient` and `menu_items` PUBLIC-READ-PRIV (`tests/unit/menu/catalog-service-client.test.ts`, `tests/integration/reservations/public-privileges.integ.test.ts`). Tabs have no equivalent store.

**Single hypothesis (confirmed against catalog + UI):** Tabs are a compile-time constant, not a staff-writable catalog. The spec must require a durable `menus` row (stable `id`, display titles, `sort_order`) that staff mutate and that guest + dish assignment read. POS stays on compiled `MENUS` (AC-4).

**Pre-mortem:** An unauthenticated client inserts a tab or an authenticated write RLS policy lands on `menus` — guest catalog is attacker-controlled. Had MT-1/MT-4 existed, writes stay `requireStaffUser` + service_role and guest roles are SELECT-only.

**Inversion / red-team:** Pushing a new object into in-memory `MENUS` can pass a shallow “create tab” test while reload still shows the five seed titles. Persistence criteria must re-read from `menus` (or assert `.from("menus")` + a second list call), not mutate the compiled seed.

## Spec

- Source: extend existing `docs/specs/menu-availability.md` (hub: `docs/specs/README.md` → this file; no `docs/specs/domains/` tree).
- Summary: Staff manage menu tabs (create / rename / reorder) via `requireStaffUser` + service client against table `menus`. Tab `id` is stable so `menu_items.menu_id` survives rename/reorder. Guest menu and the dish selector read live titles and `sort_order`. Seed keeps `midi|soir|boissons|blanc|rouge`. POS tabs remain compiled `MENUS` (AC-4).
- Clarifications needed: none. Delete-tab, POS live tabs, and tab footer/section CMS stay out of scope (ledger).

## Acceptance Criteria → Tests

| #   | Criterion                                                           | Risk | Layer           | Test file                                             | New or existing             | Test name                                                                         | Assertion                                                                                                                                                                                                                                                                                           | Command                                                                                                                    | Depends on |
| --- | ------------------------------------------------------------------- | ---- | --------------- | ----------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| C1  | MT-1 staff tab mutations use requireStaffUser + createServiceClient | P0   | unit            | tests/unit/menu/catalog-service-client.test.ts        | existing file, new `it`     | staff menu tab mutations use createServiceClient after requireStaffUser           | After staff user: `createServiceClient` called and `.from("menus")`; cookie client not called. After null staff: neither client nor `from` called for create/rename/reorder/staff list.                                                                                                             | `pnpm test:unit tests/unit/menu/catalog-service-client.test.ts`                                                            | none       |
| C2  | MT-2 rename/reorder keep menu_items.menu_id                         | P0   | unit            | tests/unit/menu/menu-tab-identity.test.ts             | new file                    | rename and reorder keep menu item menu_id                                         | After rename/reorder of `midi`, items with `menu_id: "midi"` still `midi`; only title or sort_order change.                                                                                                                                                                                         | `pnpm test:unit tests/unit/menu/menu-tab-identity.test.ts`                                                                 | C1         |
| C3  | MT-3 create persists in menus store                                 | P1   | unit            | tests/unit/menu/menu-tab-persistence.test.ts          | new file                    | created menu tab is returned by a subsequent list from menus                      | create inserts via `.from("menus")`; a second list (new read) includes the new id/title; result is not compiled `MENUS` only.                                                                                                                                                                       | `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`                                                              | C1         |
| C4  | MT-4 menus PUBLIC-READ-PRIV                                         | P0   | integration/rls | tests/integration/menu/menus-privileges.integ.test.ts | new file                    | guest roles can SELECT menus only and no authenticated full-access policy remains | Anon SELECT succeeds; anon INSERT permission-errors; service SELECT/DML works; baseline (+ privilege companions) contain REVOKE ALL then GRANT SELECT, GRANT ALL service_role, DROP auth FOR ALL and no CREATE after that drop. `assertIsolatedHoursMutationTarget()` in beforeAll + write cleanup. | `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/menu/menus-privileges.integ.test.ts` | C3         |
| C5  | MT-5 rename persists                                                | P1   | unit            | tests/unit/menu/menu-tab-persistence.test.ts          | existing new file, new `it` | renamed menu tab title is returned by a subsequent list from menus                | After rename, second list returns new title/title_en for same id.                                                                                                                                                                                                                                   | `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`                                                              | C3         |
| C6  | MT-6 reorder persists                                               | P1   | unit            | tests/unit/menu/menu-tab-persistence.test.ts          | existing new file, new `it` | reordered menu tabs are returned in saved sort_order                              | After reorder, second list is ordered by the saved sort_order.                                                                                                                                                                                                                                      | `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`                                                              | C3         |
| C7  | MT-7 dish create/edit offers live tabs                              | P1   | unit            | tests/unit/menu/dish-menu-tab-options.test.ts         | new file                    | dish menu options include newly created live tabs                                 | Options helper/action includes a tab id that is not in compiled `MENU_IDS`.                                                                                                                                                                                                                         | `pnpm test:unit tests/unit/menu/dish-menu-tab-options.test.ts`                                                             | C3         |
| C8  | MT-8 guest tab labels are live titles                               | P1   | unit            | tests/unit/menu/guest-menu-tabs.test.ts               | new file                    | guest menu tabs use live titles not compiled MENUS                                | Public tab list title for a renamed/new id equals the store title, not `MENUS.find` title.                                                                                                                                                                                                          | `pnpm test:unit tests/unit/menu/guest-menu-tabs.test.ts`                                                                   | C3         |
| C9  | MT-9 guest tab order is saved sort_order                            | P1   | unit            | tests/unit/menu/guest-menu-tabs.test.ts               | existing new file, new `it` | guest menu tabs follow saved sort_order including empty tabs                      | Public list order matches sort_order; a zero-item tab still appears.                                                                                                                                                                                                                                | `pnpm test:unit tests/unit/menu/guest-menu-tabs.test.ts`                                                                   | C6, C8     |

- **Risk** is `P0`–`P3`. C1/C2/C4 before remaining P1. C4 waits on C3 (table exists). C9 waits on C6 (order exists) and C8 (public reader exists).

## Traceability Matrix

| Criterion | Spec ref                  | Test file::name                                                                                                   | Source file(s)   | Risk | Status  |
| --------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------- | ---- | ------- |
| C1        | menu-availability.md MT-1 | catalog-service-client.test.ts::staff menu tab mutations use createServiceClient after requireStaffUser           | (fills at Green) | P0   | planned |
| C2        | menu-availability.md MT-2 | menu-tab-identity.test.ts::rename and reorder keep menu item menu_id                                              | (fills at Green) | P0   | planned |
| C3        | menu-availability.md MT-3 | menu-tab-persistence.test.ts::created menu tab is returned by a subsequent list from menus                        | (fills at Green) | P1   | planned |
| C4        | menu-availability.md MT-4 | menus-privileges.integ.test.ts::guest roles can SELECT menus only and no authenticated full-access policy remains | (fills at Green) | P0   | planned |
| C5        | menu-availability.md MT-5 | menu-tab-persistence.test.ts::renamed menu tab title is returned by a subsequent list from menus                  | (fills at Green) | P1   | planned |
| C6        | menu-availability.md MT-6 | menu-tab-persistence.test.ts::reordered menu tabs are returned in saved sort_order                                | (fills at Green) | P1   | planned |
| C7        | menu-availability.md MT-7 | dish-menu-tab-options.test.ts::dish menu options include newly created live tabs                                  | (fills at Green) | P1   | planned |
| C8        | menu-availability.md MT-8 | guest-menu-tabs.test.ts::guest menu tabs use live titles not compiled MENUS                                       | (fills at Green) | P1   | planned |
| C9        | menu-availability.md MT-9 | guest-menu-tabs.test.ts::guest menu tabs follow saved sort_order including empty tabs                             | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: local Supabase up + seeded for **C4 only** (`npx supabase start && npx supabase db reset --local`); integration phases run with `pnpm test:integration` and `$env:RESTAURANT_INTEGRATION_STRICT = 'true'` (fail-closed). C1–C3 and C5–C9 are unit/mocked — no infra.
- If C4 infra cannot be brought up, STOP that criterion (`BLOCKED (infra)`); a skipped suite is never Red/Green.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/menu-availability.md` — add MT-1–MT-9 and one AC-4 sentence that POS tabs may remain compiled `MENUS` while admin/guest use live `menus`.
- Existing-test edit: none (new `it`s / new files only).

## TDD Execution Loop

### Criterion C1 — MT-1 staff tab mutations (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("staff menu tab mutations use createServiceClient after requireStaffUser")` in `tests/unit/menu/catalog-service-client.test.ts`. Reuse the existing hoisted mocks. Assert staff `getMenuTabs` / `createMenuTab` / `renameMenuTab` / `reorderMenuTabs` call `requireStaffUser` then `createServiceClient` and `.from("menus")`, never the cookie client; null staff calls none of those. Must execute and fail (missing exports or no `from("menus")`). Command: `pnpm test:unit tests/unit/menu/catalog-service-client.test.ts`.
- **Green** → Invoke `tdd-green` to add the minimal staff tab actions (same `requireStaffUser` + `createServiceClient` pattern as item CRUD in `app/actions/menu.ts`). Exit = target test green, executed. Consult Supabase skill if client API uncertain.
- **Refactor** → Invoke `tdd-refactor` to clean C1 source; exit = target test green + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion C2 — MT-2 stable tab identity (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/menu/menu-tab-identity.test.ts` :: `rename and reorder keep menu item menu_id`. After rename/reorder of id `midi`, `menu_items.menu_id` for existing rows stays `midi`. Must fail on today's code. Command: `pnpm test:unit tests/unit/menu/menu-tab-identity.test.ts`.
- **Green** → Invoke `tdd-green` to make rename/reorder update titles / sort_order only (never rewrite `menu_items.menu_id`). Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C2; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C3 — MT-3 create persists (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/menu/menu-tab-persistence.test.ts` :: `created menu tab is returned by a subsequent list from menus`. Assert insert + a second list includes the new tab from `menus`, not compiled `MENUS` alone. Command: `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`.
- **Green** → Invoke `tdd-green` to persist `createMenuTab` into `menus` and list from that table (schema/seed of the five current ids as needed for a later reload). Exit = target test green. Do not implement rename/reorder persist here.
- **Refactor** → Invoke `tdd-refactor` to clean C3; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C4 — MT-4 menus PUBLIC-READ-PRIV (layer: integration/rls)

- **Red** → Invoke `tdd-red` to write `tests/integration/menu/menus-privileges.integ.test.ts` :: `guest roles can SELECT menus only and no authenticated full-access policy remains`. Mirror `public-privileges.integ.test.ts` menu_items recipe. `assertIsolatedHoursMutationTarget()` first in `beforeAll` and write cleanup. Command: `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/menu/menus-privileges.integ.test.ts`. Skipped suite = BLOCKED (infra).
- **Green** → Invoke `tdd-green` to add `menus` with the same privilege/RLS shape as `menu_items` (extend baseline + privilege companions per supabase-migrations.mdc). Exit = target test green, executed not skipped.
- **Refactor** → Invoke `tdd-refactor` to clean C4; re-run the integration command fail-closed; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C5 — MT-5 rename persists (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("renamed menu tab title is returned by a subsequent list from menus")` in `tests/unit/menu/menu-tab-persistence.test.ts`. Second list must show new title/title_en for the same id. Command: `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`.
- **Green** → Invoke `tdd-green` to persist `renameMenuTab` as an update of titles only. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C5; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C6 — MT-6 reorder persists (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("reordered menu tabs are returned in saved sort_order")` in `tests/unit/menu/menu-tab-persistence.test.ts`. Command: `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`.
- **Green** → Invoke `tdd-green` to persist `reorderMenuTabs` via `sort_order`. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C6; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C7 — MT-7 dish assignment lists live tabs (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/menu/dish-menu-tab-options.test.ts` :: `dish menu options include newly created live tabs`. Options must include an id absent from compiled `MENU_IDS`. Command: `pnpm test:unit tests/unit/menu/dish-menu-tab-options.test.ts`.
- **Green** → Invoke `tdd-green` to point `/admin/menu` dish create/edit options at the live tab list. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C7; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C8 — MT-8 guest configured names (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/menu/guest-menu-tabs.test.ts` :: `guest menu tabs use live titles not compiled MENUS`. Command: `pnpm test:unit tests/unit/menu/guest-menu-tabs.test.ts`.
- **Green** → Invoke `tdd-green` to make guest `/[locale]/menu` tab labels read live titles. Exit = target test green. Do not implement empty-tab order here if that is C9-only.
- **Refactor** → Invoke `tdd-refactor` to clean C8; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C9 — MT-9 guest saved order (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("guest menu tabs follow saved sort_order including empty tabs")` in `tests/unit/menu/guest-menu-tabs.test.ts`. Command: `pnpm test:unit tests/unit/menu/guest-menu-tabs.test.ts`.
- **Green** → Invoke `tdd-green` to list guest tabs by saved `sort_order` and include empty tabs. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C9; exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-70_admin_menu_tabs_c3a91f2b`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-70_admin_menu_tabs_c3a91f2b.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/menu-availability.md`
Criteria: 9 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/menu-availability.md` | existing-test edit none
Infra: local Supabase (fail-closed integration) for MT-4; other criteria unit/mocked
Full plan: not posted to Linear (size-bounded digest) · local copy `res-70_admin_menu_tabs_c3a91f2b.plan.md`

Problem: `/admin/menu` tabs are compiled `MENUS`/`MenuId`. Admins cannot create, rename, or reorder tabs; guest menu and dish assignment share that seed. The spec never required a durable tab catalog.
Approach: Add MT-1–MT-9 to menu-availability.md. Staff mutate table `menus` via requireStaffUser + service client. Tab id stays stable so dishes stay associated. Guest menu and dish selector read live titles and sort_order. POS tabs stay on compiled MENUS (AC-4).
Out-of-scope findings: POS live tabs (med); tab delete (low)

| #   | Criterion                      | Risk | Layer       | Test file                                             |
| --- | ------------------------------ | ---- | ----------- | ----------------------------------------------------- |
| C1  | Staff tab writes staff+service | P0   | unit        | tests/unit/menu/catalog-service-client.test.ts        |
| C2  | Rename/reorder keep menu_id    | P0   | unit        | tests/unit/menu/menu-tab-identity.test.ts             |
| C3  | Create persists                | P1   | unit        | tests/unit/menu/menu-tab-persistence.test.ts          |
| C4  | menus PUBLIC-READ-PRIV         | P0   | integration | tests/integration/menu/menus-privileges.integ.test.ts |
| C5  | Rename persists                | P1   | unit        | tests/unit/menu/menu-tab-persistence.test.ts          |
| C6  | Reorder persists               | P1   | unit        | tests/unit/menu/menu-tab-persistence.test.ts          |
| C7  | Dish options include live tabs | P1   | unit        | tests/unit/menu/dish-menu-tab-options.test.ts         |
| C8  | Guest uses live titles         | P1   | unit        | tests/unit/menu/guest-menu-tabs.test.ts               |
| C9  | Guest uses saved order + empty | P1   | unit        | tests/unit/menu/guest-menu-tabs.test.ts               |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-70 (plan: res-70_admin_menu_tabs_c3a91f2b), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Then: apply the approved spec edit on `docs/specs/menu-availability.md`, `pnpm exec prettier --write` that path, then C1-red through C9-refactor.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

- `4d-review-trail` INPUT: `docs/verifier-reports/tdd/res-70_admin_menu_tabs_c3a91f2b.md` — OUTPUT: `## Suggested Review Order (collated)`
- `4e-traceability` INPUT: same tdd log — OUTPUT: `## Traceability (final)` + `## Run metrics`
- `4-docs-packet` assembles the Docs sync packet
- `4-docs-updater` delegates with that packet
- `4c-findings` INPUT: `docs/findings/runs/res-70_admin_menu_tabs_c3a91f2b.md` merged into `docs/findings/<category>.md`
- `4b-linear` FIX close-out after 4C
- `4-format` INPUT: dirty paths from `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <path> …` (never `.`); then STEP 4G then STEP 4F

```markdown
## Docs sync packet

- plan_slug: res-70_admin_menu_tabs_c3a91f2b
- spec: docs/specs/menu-availability.md
- mode: FIX
- linear_issue: RES-70
- criteria_shipped: [C1, C2, C3, C4, C5, C6, C7, C8, C9]
- criteria_manual_uat: none
- req_ids: [MT-1, MT-2, MT-3, MT-4, MT-5, MT-6, MT-7, MT-8, MT-9]
- source_paths: []
- test_paths: [tests/unit/menu/catalog-service-client.test.ts, tests/unit/menu/menu-tab-identity.test.ts, tests/unit/menu/menu-tab-persistence.test.ts, tests/integration/menu/menus-privileges.integ.test.ts, tests/unit/menu/dish-menu-tab-options.test.ts, tests/unit/menu/guest-menu-tabs.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-70_admin_menu_tabs_c3a91f2b.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                  | Where (file:line/area)                                       | Why it matters                                                    | Severity | Relation                                                          |
| ---------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| POS picker tabs stay on compiled `MENUS` | `components/staff/pos-terminal.tsx` / menu-availability AC-4 | New admin tabs cannot be sold on POS until a later AC amends AC-4 | med      | deferred — RES-70 ACs name admin, dish assignment, and guest only |
| Tab delete not specified                 | `/admin/menu`                                                | No remove/archive path; leftover empty tabs accumulate            | low      | not in Linear ACs                                                 |

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-70 (plan: res-70_admin_menu_tabs_c3a91f2b), posting this plan's `## Linear Plan Digest` as the `Work started:` comment. Task `run_in_background: true`; do not wait before spec/C1.
- **Close-out (FIX):** after 4/4C, delegate `linear-resolver` to post the structured resolution comment only (no workflow state write).
- **Findings registration:** merge the run file into `docs/findings/<category>.md`, then delegate `linear-resolver` (filing floor / attach-over-create / cap 3). Managed Cloud does not auto-confirm net-new finding issues — persist and STOP if a new issue is proposed. POS live tabs is med product-gap (below high floor → likely left on ledger). Tab delete is low (left on ledger).

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [auth] staff tab actions + `menus` RLS/privileges
- [schema] `menus` table + seed of five current ids
- [public-api] guest tab reader + dish selector options
- [security] no authenticated write policy on `menus`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none yet (filled from refactor log)
- Traceability finalized in tdd log `## Traceability (final)`: yes (at close-out)
- Run metrics stamped in tdd log `## Run metrics`: yes (at close-out)
- `node .cursor/checks/harness-lint.mjs res-70_admin_menu_tabs_c3a91f2b`: pending close-out

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Launch START (`run_in_background: true`; do not wait), apply the spec edit listed in `## Permissions Requested`, then delegate Criterion C1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

# Morning dispatch 2026-10-04

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Scope: no argument
- Candidate projects: ongoing none · available restaurant-system V-0.5 (`P-RES-12`, uuid `d355ac92-faa0-4866-b501-32880e087b91`, status Backlog)
- Current cycle: Cycle 9 `ea824b21-683f-409a-8c75-2e564285813b` (2026-09-27T22:00:00.000Z through 2026-10-04T22:00:00.000Z)

Terminal excluded: V-0.2 Completed, V-0.1 Completed. In Progress 0. In Review 0.

Milestone rank inside V-0.5, from this run's reads:

- M1 — Project Kickoff: Complete (progress 100, no open member)
- M2 — Requirements Sign-Off: incomplete, sortOrder 928, requirements gate
- M3 — Design Approval: ambiguous (progress 0, no open member)
- M4 — Code Complete (Feature Freeze): incomplete, sortOrder 2975
- M5 — Alpha Release: incomplete, sortOrder 4010
- M6 — Beta Release: ambiguous (progress 0, no open member)
- M7 — Release Candidate (RC): incomplete, sortOrder 6074
- M8 — General Availability (GA): incomplete, sortOrder 7143, security gate
- M9 — Project Closure (Retro): ambiguous (progress 0, no open member)

Issue rank uses that milestone order, then priority, then risk. No verified estimate on any scoped issue, so estimate is omitted.

## Portfolio Coverage

Scoped Backlog is 39 issues. Existing metadata that already matches the route is a groom no-op. `groom-portfolio` writes nothing.

Executable `/sdd-to-tdd`, dependency-ready, metadata already set, Backlog, cycle null:

- **RES-130** Capture PHASE 5 work-order rule — High · M2 · `docs/specs/dev-toolchain.md` G-CAP1 · blockedBy none
- **RES-121** Amend BD-READ-FAIL catalog key — Low · M2 · `docs/specs/booking-rules.md` BD-READ-FAIL · blockedBy none
- **RES-117** Hero image upload fails — High · M4 · `docs/specs/branding-cms.md` BC-2 · blockedBy none
- **RES-119** Mobile floor inspector — High · M4 · `docs/specs/scheduling.md` FP-12 · blockedBy none
- **RES-113** SELECT allowlist pin — Medium · M5 · `docs/specs/reservation-analytics.md` RA-7 RA-10 · blockedBy none
- **RES-128** Non-staff sign-in keeps a session — Urgent · M8 · `docs/specs/staff-authorization.md` SA-3 · blockedBy none · not selected (capacity)
- **RES-129** Callback next concatenated — High · M8 · `docs/specs/staff-authorization.md` SA-3 · blockedBy none · not selected
- **RES-122** Timezone-shifted reservation dates — High · M7 · bug against scheduling timezone · not selected
- **RES-96** Hosted review-email activation — High · M7 · `docs/specs/post-visit-review-email.md` · not selected
- **RES-101** SECURITY DEFINER in public — High · M8 · security · not selected
- **RES-98** Staff-path startsWith — Medium · M8 · `docs/specs/staff-authorization.md` SA-2
- **RES-99** Guest SELECT of 86'd rows — Medium · M8
- **RES-100** Permissive availability fallbacks — Medium · M8
- **RES-114** Analytics service-role DML — Medium · M8 · RA-2
- **RES-102** Unauth inquiry Result — Medium · M5 · `docs/specs/event-inquiries.md`
- **RES-125** select star row spread — Medium · M8 · guest profile read
- **RES-124** Unvalidated PII write — Medium · M8
- **RES-127** Armed hook edit — Medium · M8 · dev-toolchain
- **RES-126** Checkout-name normalize — Medium · M8 · dev-toolchain
- **RES-91** Group and event inquiries — Low · M5 · `docs/specs/event-inquiries.md`

Organizational containers (Backlog, unscheduled, no direct execution):

- **RES-95** Guest CRM parent
- **RES-92** Guest visit identity parent
- **RES-94** Guest allergen parent
- **RES-123** Menu-tab residual umbrella

Pending a decision, not activated:

- **RES-81** Reserve with Google — High · M2 · no governing spec · mixed integration and implementation
- **RES-73** Allergen on/off setting — Medium · M2 · blockedBy RES-75 which is Done · `docs/specs/allergen-capture.md` has no enable/disable setting
- **RES-82** Returning-guest highlight — Medium · M2 · out of `docs/specs/guest-profiles.md`
- **RES-106** Tags and notes — Medium · M2
- **RES-105** Reservation source channel — Medium · M2
- **RES-87** Targeted campaigns — Medium · M2 · parent RES-95
- **RES-85** Important dates — Medium · M2 · parent RES-95
- **RES-108** J-1 reconfirmation — Medium · M2
- **RES-78** Visit history — Low · M5 · parent RES-92
- **RES-79** Visit count — Low · M5 · parent RES-92
- **RES-111** Shared ratings — Low · M2
- **RES-109** Blacklist — Low · M2
- **RES-112** Menu QR — Low · M2
- **RES-110** Bank guarantee — Low · M2
- **RES-131** POS empty table — no priority, no milestone · cannot assign without a severity or a criterion

`groom-portfolio`: no-op for every Backlog issue whose project, milestone, and priority are already set. RES-131 deferred. No estimate writes.

## Daily Queue Capacity

- Existing active Todo/current-cycle: 5 (RES-69, RES-118, RES-107, RES-84, RES-86)
- Eligible ready Backlog: 5 selected from the ranked executable set above; further M7/M8 issues stay eligible but past the slot count
- Bounds: preferred minimum 5 · hard maximum 10
- Activation slots: 5
- Selected daily wave: RES-130, RES-121, RES-117, RES-119, RES-113
- Projected active: 10
- Shortfall: none
- Over cap: none

`node` capacity: activeCount 5, eligibleCount at least 5, availableSlots 5, activationCount 5, projectedActiveCount 10, shortfall 0, overCapacity false.

## Approval Scopes

- `clarify-*`: none posted. RES-84 and RES-69 already have one open clarification each.
- `groom-portfolio`: none
- `activate-daily-wave`: RES-130, RES-121, RES-117, RES-119, RES-113. Expected source Backlog. Keep current project V-0.5, milestone, and priority. Target Todo · Cycle 9.
- `emit-daily-plan`: re-read the five existing Todo issues and the five wave issues
- Ready briefs, at most 3 new, after activation: RES-118, RES-107, RES-130. Re-check RES-69 (already complete).

## Execution Todos

- `activate-daily-wave`: authorized
- `ready-RES-118`, `ready-RES-107`, `ready-RES-130`: authorized after the wave re-read
- `emit-daily-plan`: authorized
- `project-update`: authorized with health offTrack

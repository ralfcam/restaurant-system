# Findings ledger

Open out-of-scope discoveries from `/sdd-to-tdd`, `/capture`, and `/audit`
PART 8. **Active files hold open items only.** After an item is filed to
Linear (`RES-###`), move it to [archive.md](./archive.md).

Workflow ownership:
`docs/findings + Linear Triage → /triage → Backlog → /dispatch → Todo/current cycle`.
Linear **Triage** is the team's special intake inbox, not a normal workflow
status.

| File                                 | Category                          |
| ------------------------------------ | --------------------------------- |
| [security.md](./security.md)         | Security smells, auth/RLS gaps    |
| [tech-debt.md](./tech-debt.md)       | Refactors, duplication, dead code |
| [test-debt.md](./test-debt.md)       | Missing/flaky/skipped coverage    |
| [product-gaps.md](./product-gaps.md) | Spec↔product mismatches           |

Entry format (one line per open item):

```markdown
- [ ] <title> · <file:line/area> · <why it matters> · <severity> · (found: <RES-###>/<criterion>/<phase>)
```

## Issue-filing policy (throttle creation, prefer re-use)

Cited by `linear-resolver`, `/sdd-to-tdd` STEP 4C, `/triage`, and `/audit`
PART 8. Fixed team: **Realized** (`RES`, issue IDs **`RES-###`**). There is no
default Linear project: discover nonterminal `V-X.X` version projects and
allocate fail-closed per
[.cursor/rules/linear-project-routing.mdc](../../.cursor/rules/linear-project-routing.mdc).

**Filing floor.** Propose new Linear work only at or above:

- `security.md`: `med` or `high`
- other category files: `high` only
- `/audit` PART 8 hand-off: Blocker + High for every category, plus Medium
  for `security.md`
- **WIP-gated floor:** when `/triage` reports more than **15** open
  Urgent+High, the floor tightens to Blocker / Urgent only until the gate
  clears

**Attach-over-create ladder** (stop at the first hit):

1. Attach a comment on an open issue that already covers the finding
   (category + area/path, not title words alone).
2. Sub-issue of an existing epic in the same area/spec.
3. One umbrella issue for three or more same-run findings in the same area.
4. Standalone issue only when genuinely novel.

**Per-run cap.** `/sdd-to-tdd` STEP 4C may create at most **3** net-new
issues. Overflow stays on the ledger for `/triage`.

**Ledger TTL.** `/triage` stamps below-floor lines `(seen: /triage YYYY-MM-DD)`.
A second sighting, or a first stamp **>60 days** old → archive as
`wont-file (stale)`.

**Prunable class** (batch cancel under one operator confirmation): Backlog +
Medium-or-lower + no `security` + no update in **45+ days**.

**Milestone.** `/dispatch` finalizes the milestone for ordinary accepted
Backlog work. `/triage` assigns one only for its explicit Urgent fast lane.
Use an **existing milestone owned by the allocated `V-X.X` project** by exact
Linear name (em dash `—`). Never reuse a same-named milestone across projects,
invent `Launch-blocking`, or hardcode a project; call `list_milestones` for
the owning project and use the map below.

| Signal                                             | Milestone                                  |
| -------------------------------------------------- | ------------------------------------------ |
| Bootstrap, staffing, repo/harness                  | `M1 — Project Kickoff`                     |
| Spec-gap, PRD, spec-contradiction clarification    | `M2 — Requirements Sign-Off`               |
| Architecture, schema, UX/wireframes                | `M3 — Design Approval`                     |
| Feature implementation (pre-freeze)                | `M4 — Code Complete (Feature Freeze)`      |
| test-debt, internal QA, `/audit`                   | `M5 — Alpha Release`                       |
| product-gap / `/capture` that needs real users     | `M6 — Beta Release`                        |
| UAT / deploy-gate / critical-bug polish            | `M7 — Release Candidate (RC)`              |
| Launch-bound Urgent/High, security, money, go-live | `M8 — General Availability (GA) / Go-Live` |
| Everything else (maintenance, after GA)            | `M9 — Project Closure (Retrospective)`     |

Empty M1–M9 will look incomplete/ambiguous in `/dispatch` until they have
member issues; that is acceptable.

**Command-to-milestone contract.**

- `/design` is pre-implementation work only: M1 for genuine project/bootstrap
  definition, M2 for requirements/spec definition, and M3 for architecture,
  schema, or UX decisions.
- `/sdd-to-tdd` may remain M2 for an existing-spec contract
  clarification/correction. FEATURE/FIX implementation maps to M4; test/audit,
  real-user beta validation, UAT/RC, launch-critical/security/money, and
  maintenance map to M5, M6, M7, M8, and M9. Do not apply a blanket M4+ rule;
  route by work type.
- Work mixing unresolved design and implementation is split into linked issues.
  The M1–M3 decision/design issue blocks the later implementation issue, which
  `/dispatch` must not schedule until the governing spec is testable.

**Scheduling ownership.** Two Linear axes: **milestones** = SDLC phase
(M1–M9 above); **cycles** = this sprint.

- `/triage` ordinary acceptance → **Backlog, no cycle**. It does not finalize
  ordinary milestone, priority, or estimate.
- `/triage` fast lane → **Todo + current cycle** only for a ledger
  **Blocker** (mapped to Linear **Urgent**) or an already explicitly Urgent
  Linear Triage issue.
- A `blocked-by` relation affects dependency order; it does not by itself
  make an issue Urgent.
- `/dispatch` selects a capacity-bounded Backlog batch, finalizes its
  milestone/priority/estimate, and moves only the approved selection to
  **Todo + current cycle**.
- A dispatch card may include an issue only after a post-apply re-read
  confirms **Todo** in the current cycle.
- Backlog and ordinary new REGISTER FINDINGS issues remain unscheduled.
- In Progress / In Review / Done are automation-owned; intake/scheduling
  commands do not perform routine metadata backfill on them.
- Resolve current cycle at apply time with
  `list_cycles({ teamId, type: "current" })`. Never invent a cycle or use
  next/previous.

**Estimate crosswalk** (audit Effort → Linear estimate):

| Effort | Linear estimate |
| ------ | --------------- |
| S      | 1               |
| M      | 3               |
| L      | 5               |

**Priority crosswalk**

| audit   | sdd-to-tdd risk                   | ledger                    | Linear |
| ------- | --------------------------------- | ------------------------- | ------ |
| Blocker | P0 (auth / data / status-machine) | high + security/auth area | Urgent |
| High    | P1                                | high                      | High   |
| Medium  | P2                                | med                       | Medium |
| Low     | P3                                | low                       | Low    |

When two signals disagree, take the higher.

`Blocker` is ledger terminology and maps to Linear `Urgent`. A
`blocked-by` relation is not a severity signal and never triggers that mapping
on its own.

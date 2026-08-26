# Findings ledger

Open out-of-scope discoveries from `/sdd-to-tdd`, `/capture`, and `/audit`
PART 8. **Active files hold open items only.** After an item is filed to
Linear (`REAZED-###`), move it to [archive.md](./archive.md).

| File                                 | Category                          |
| ------------------------------------ | --------------------------------- |
| [security.md](./security.md)         | Security smells, auth/RLS gaps    |
| [tech-debt.md](./tech-debt.md)       | Refactors, duplication, dead code |
| [test-debt.md](./test-debt.md)       | Missing/flaky/skipped coverage    |
| [product-gaps.md](./product-gaps.md) | Spec↔product mismatches           |

Entry format (one line per open item):

```markdown
- [ ] <title> · <file:line/area> · <why it matters> · <severity> · (found: <REAZED-###>/<criterion>/<phase>)
```

## Issue-filing policy (throttle creation, prefer re-use)

Cited by `linear-resolver`, `/sdd-to-tdd` STEP 4C, `/triage`, and `/audit`
PART 8. Default project: **restaurant-system**. Prefix: **`REAZED-###`**.

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

**Milestone.** Assign an **existing** restaurant-system project milestone by
exact Linear name (em dash `—`). Never invent `Launch-blocking`. Agents
must `list_milestones` then assign by the map below — never invent a name.

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

**Cycle.** Two Linear axes: **milestones** = SDLC phase (M1–M9 above);
**cycles** = this sprint. Never invent a cycle name. Resolve the current
cycle at apply time with `list_cycles({ teamId, type: "current" })` — do
not hardcode a cycle number here.

- **Todo means scheduled:** assign the team’s **current** Linear cycle.
- **Backlog / new REGISTER FINDINGS issues:** no cycle (unscheduled).
- **In Progress / In Review** missing a cycle: GROOM may set current cycle
  as a **field-only** write (no state move; In Progress stays START-only).
- If `list_cycles(current)` is empty: `cannot verify`, skip cycle, still
  assign milestone.
- Never auto-assign **next** or **previous**.

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

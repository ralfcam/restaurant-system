# TDD log — res-103_collapsed_summary_gap_e8a4c1d2

### C1

Suggested review order:
- [public-api] `components/site/reservation-widget.tsx:516` — `accordionTriggerCls` (`text-xs gap-1.5`) shared collapsed chrome gap
- [public-api] `components/site/reservation-widget.tsx:649` — guests `AccordionTrigger`
- [public-api] `components/site/reservation-widget.tsx:735` — date `AccordionTrigger`
- [public-api] `components/site/reservation-widget.tsx:811` — time `AccordionTrigger`
- [public-api] `components/ui/accordion.tsx:50` — primitive `flex` + `justify-between` + `**:data-[slot=accordion-trigger-icon]:ml-auto`

Reusable pattern: reservation-widget chrome-spacing scans must resolve named `cn` trigger classNames and exclude the inner icon-to-label `gap-1.5` when asserting label↔summary separation

## Suggested Review Order (collated)

Highest-risk first.

- [public-api] Shared collapsed chrome gap — `components/site/reservation-widget.tsx:516` `accordionTriggerCls` (`text-xs gap-1.5`)
- [public-api] Guests / date / time triggers — `components/site/reservation-widget.tsx:649`, `:735`, `:811`
- [public-api] Primitive flex packing — `components/ui/accordion.tsx:50` `flex` + `justify-between` + `**:data-[slot=accordion-trigger-icon]:ml-auto`
- Contract pin — `tests/unit/reservation-widget/collapsed-summary-gap.test.ts:166`

## Traceability (final)

Run: 2026-09-17 · plan: res-103_collapsed_summary_gap_e8a4c1d2 · issue: RES-103

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md BW-17 | collapsed-summary-gap.test.ts::collapsed guests and date summaries are separated from their accordion labels | components/site/reservation-widget.tsx | P3 | shipped |

## Run metrics

Run: 2026-09-17 → 2026-09-17 · plan: res-103_collapsed_summary_gap_e8a4c1d2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor) — cap 3/run

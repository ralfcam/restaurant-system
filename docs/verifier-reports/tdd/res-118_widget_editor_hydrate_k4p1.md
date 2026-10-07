# TDD log res-118_widget_editor_hydrate_k4p1

### SW-7

Suggested review order:
- Hydrate row id 1 into the editor
  - `app/admin/settings/page.tsx:23` [security]
  - `app/admin/settings/page.tsx:65` [public-api]
- Uncontrolled initial values
  - `components/staff/widget-page-editor.tsx:56`
  - `components/staff/widget-page-editor.tsx:64`
Reusable pattern: Hydrate this uncontrolled staff form from a server maybeSingle by passing text columns as defaultValue (null to empty) and show_reservation_phone as defaultChecked.

## Suggested Review Order (collated)

- Service-role read of restaurant_settings id 1 — `app/admin/settings/page.tsx:23` [security]
- Saved text and phone flag passed into the editor — `app/admin/settings/page.tsx:65` [public-api]
- Initial input values an unedited submit sends — `components/staff/widget-page-editor.tsx:56`, `components/staff/widget-page-editor.tsx:64`

## Traceability (final)

Run: 2026-10-04 · plan: res-118_widget_editor_hydrate_k4p1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| SW-7 | standalone-reservation-widget.md SW-7 | tests/unit/site/standalone-reservation-widget.test.ts::SW-7 settings editor shows saved copy and the phone flag | app/admin/settings/page.tsx, components/staff/widget-page-editor.tsx | P0 | shipped |

## Run metrics

Run: 2026-10-04 → 2026-10-04 · plan: res-118_widget_editor_hydrate_k4p1
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor) — cap 3/run

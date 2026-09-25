# Findings run — pr120_routed_bugs_fix_8b3fc479

## security

## tech-debt

- [ ] `getAvailableSlots` settings read error falls back to 30/90/15 · `app/actions/reservations.ts:803` · a `restaurant_settings` SELECT error is logged, then slot interval, occupancy, and buffer still use `?? 30`, `DEFAULT_EXPECTED_MINUTES` (90), and `?? 15`; guest slot generation stays open on a failed read, outside FP-5 and CL-1 · med · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C1/red)
- [ ] Occupying-reservation SELECT failure returns `assignFailed` with no server log · `app/actions/reservations.ts` (`occupyingError` in `assignReservationTable`, ~458) · a failed occupancy query refuses the write, but unlike the settings read it never calls `console.error`, so that failure is silent in server logs · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C1/green)

## test-debt

- [ ] Settings-read failure does not pin re-select or clearing an assigned table · `tests/unit/reservations/assign-table.test.ts:274-358` · the C1 case uses `table_label: null`, refuses label `"1"`, and accepts `null`; it does not show that re-selecting the current label, or clearing a label that is already set, still writes when the settings SELECT fails · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C1/refactor)
- [ ] Settings thenable clears a SELECT error when a row is present · `tests/unit/reservations/available-slots.test.ts:56` · `maybeSingle` returns `error: null` whenever `data` is non-null, so a settings failure that also includes a row cannot be asserted · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C2/red)
- [ ] AC-21 suite never produces `settingsLoadFailed` · `tests/unit/availability/message-keys.test.ts:345` · the unmapped case saves days with no bookable slots, so the settings SELECT branch is outside that suite and only the slot-interval test locks the new key · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C3/green)
- [ ] Fail-closed test does not pin the settings log · `tests/unit/availability/upsert-slot-interval.test.ts:149` · `errorSpy` is only `toHaveBeenCalled()`, so any other `console.error` in the action satisfies the "MUST log" half of CL-1-INTERVAL · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C3/refactor)
- [ ] Scheduling message-key catalog omits `duplicateSlotTime` · `tests/unit/availability/message-keys.test.ts:23` · `KEYS` stops at `invalidSlotMax`, so that suite never pins the new catalog key or a producer that returns it · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C4/red)

## product-gaps

- [ ] Duplicate time is reported only after `invalidSlotMax` · `lib/reservations/operating-hours.ts:576` · a second copy of a time that also has a non-positive or non-integer `max_covers` returns `errors.scheduling.invalidSlotMax`, so the duplicate is hidden until that max is fixed · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C4/green)
- [ ] Hours preview is hardcoded to French on the English scheduling page · `components/staff/scheduling-manager.tsx:173` · `summarizeOperatingDays(operatingDays, "fr")` rendered "Lun · Dinner 18:00–22:00; Mar–Dim · Fermé" inside the English Save preview · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C5/red)
- [ ] Blocked-date labels stay French on every locale · `components/staff/scheduling-manager.tsx:65` · `formatBlockedDateLabel` calls `toLocaleDateString("fr", …)` and that string is rendered in the blocked-date list, so an English scheduling page still shows French weekday and month names · low · (found: tdd/pr120_routed_bugs_fix_8b3fc479/C5/green)

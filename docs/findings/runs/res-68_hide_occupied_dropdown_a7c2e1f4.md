# Findings run — res-68_hide_occupied_dropdown_a7c2e1f4

## security

## tech-debt

- [ ] Occupying-window scan duplicated vs write path / planAutoAssignments · `lib/reservations/selectable-tables.ts` claimedOccupyingLabels · three copies of skip-self / date / ACTIVE / overlap can drift · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C1/refactor)
- [ ] Dual self keys: currentLabel keep-path vs occupancy.candidate.id skip · `lib/reservations/selectable-tables.ts` · a caller that sets currentLabel to a foreign claimed label still offers it · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C1/refactor)

## test-debt

- [ ] C1 does not pin cancelled / completed / no_show or other-date occupants leaving Table 8 selectable · `tests/unit/reservations/selectable-tables.test.ts` · only overlapping seated/confirmed hide is asserted · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C1/refactor)
- [ ] Own occupying confirmed not asserted · `tests/unit/reservations/selectable-tables.test.ts` C2 · spec occupying is confirmed|seated; C2 only uses seated · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C2/red)
- [ ] Skip-own-id does not keep a non-available / undersize own table without currentLabel · `lib/reservations/selectable-tables.ts` + C2 · floor-seated own table would drop unless UI passes tableLabel · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C2/green)
- [ ] C2 title says current label but pins skip-own-id · `tests/unit/reservations/selectable-tables.test.ts` · currentLabel is omitted; reviewer can think C2 covers the keep-path · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C2/refactor)

## product-gaps

- [ ] Floor status chrome still painted on selectable options · `components/staff/reservations-manager.tsx` TableAssignment option text (`table.status !== "available"`) · C3 keeps a non-overlapping floor-`seated` label selectable, so the option can still read “· seated” · low · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C1/red)
- [ ] no_show still not disabled on Table assignment select · `components/staff/reservations-manager.tsx` TableAssignment · write path refuses closed rows but UI still enables no_show · med · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/plan)
- [ ] Dropdown occupancy uses hardcoded 90+15, write path uses restaurant_settings · `lib/reservations/selectable-tables.ts` vs `app/actions/reservations.ts` assignReservationTable · helper can diverge if settings change · med · spec: docs/specs/scheduling.md · (found: tdd/res-68_hide_occupied_dropdown_a7c2e1f4/C1/green)

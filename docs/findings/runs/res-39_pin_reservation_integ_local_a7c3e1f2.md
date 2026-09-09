# Findings run — res-39_pin_reservation_integ_local_a7c3e1f2

Open residuals from `/sdd-to-tdd` RES-39. Category headings only; prune at close-out.

## security

## tech-debt

## test-debt

- [ ] Marketing review-email-schema integ has no local-host isolation pin · `tests/integration/marketing/review-email-schema.integ.test.ts` vs `assertIsolatedHoursMutationTarget` · same class as RES-39: service-role writes; a remote URL would mutate `tilcqrudqxznnpepxjqq` · high · (found: tdd/res-39_pin_reservation_integ_local_a7c3e1f2/plan/triage)

- [ ] POS orders-persistence integ has no local-host isolation pin · `tests/integration/pos/orders-persistence.integ.test.ts` vs `assertIsolatedHoursMutationTarget` · same class: service-role insert/delete without the hours isolation pin · high · (found: tdd/res-39_pin_reservation_integ_local_a7c3e1f2/plan/triage)

## product-gaps

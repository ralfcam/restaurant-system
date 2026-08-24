# TDD verifier report — segmented booking widget (`69dce340`)

FEATURE run. Branch: `sdd/segmented-booking-widget` (from `staging`). No Linear ID named — `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Exclusive assign + interval [booking]

- `lib/reservations/operating-hours.ts` — `assignSegmentForTime` (later `opens_at` wins; inclusive contains helper; booking validation stays inclusive so last slot remains bookable)
- `lib/reservations/operating-hours.ts` — `slotUntilTime` / `wrapMinutesOfDay` (90 from `DEFAULT_EXPECTED_MINUTES`; wrap past midnight)
- `lib/reservations/operating-hours.ts` — `clampSlotIntervalMinutes` / `ALLOWED_SLOT_INTERVALS` `{15,30,60}` default 30
- `app/actions/reservations.ts` — `getAvailableSlots` reads `restaurant_settings.slot_interval_minutes`, clamps, passes `stepMinutes` into existing `bookableTimesForDay` (no second generator)
- Pins: `tests/unit/reservations/operating-hours.test.ts` (C1–C3, C6); `tests/unit/reservations/available-slots.test.ts` (C7)

### 2. Schema [schema]

- `operating_windows.guest_note` — baseline CREATE + `20260818162000_operating_hour_segments.sql` `ADD COLUMN IF NOT EXISTS`; `replace_operating_windows` maps `NULLIF(BTRIM(w->>'guest_note'), '')`
- `restaurant_settings.slot_interval_minutes INT NOT NULL DEFAULT 30` CHECK `(15, 30, 60)` — baseline + `20260823130000_restaurant_info_and_chefs_picks.sql`
- Pins: `tests/unit/scheduling/schema.test.ts` (C4); `tests/unit/branding/schema.test.ts` (C5)

**Remote caveat:** folding DDL into already-applied dated migrations does not add columns on linked remotes (findings).

### 3. Public widget [public-api]

- `lib/reservations/operating-hours.ts` — `groupBookableSlots` (sort_order, unlabeled range heading, omit empty groups, attach trimmed `guest_note`)
- `components/site/reservation-widget.tsx` — grouped cards (`slot-group` / `slot-card` / `until`); exclusive accordion guests/date/time (`defaultValue="time"`); `pickSlot` does not `setStep(2)`; `data-testid="reserve"` `disabled={!slot}` then `setStep(2)` (does not call `createReservation`); `h-[380px]` + scroll region
- Chrome i18n: `useTranslations("reservationWidget")` + `useLocale()`; keys in `messages/fr.json` / `messages/en.json`; staff labels/notes untranslated
- Pins: `tests/unit/reservation-widget/segment-groups.test.ts`, `chrome-i18n.test.ts`, `tests/unit/i18n/messages-parity.test.ts`

### 4. Floor vs per-table Expected [floor]

- Restaurant-wide interval on `/admin/floor` (`data-testid="slot-interval-control"` **before** inspector) via `updateSlotIntervalMinutes` / `getSlotIntervalMinutes` in `app/actions/branding.ts`
- `tables.expected_minutes` remains live-floor clocks only — until-badge is start + 90, not per-table Expected
- Pins: `tests/unit/floor/slot-interval.test.ts`

### 5. Scheduling guest_note [staff]

- `components/staff/scheduling-manager.tsx` — control on `scheduling-segment-row`
- `WINDOW_COLUMNS`, `flattenDaysToRows`, `groupRowsByDay`, `upsertOperatingWindows` payload
- Pin: `tests/unit/availability/actions.test.ts`

## Traceability (final)

| ID | Spec | Test | Source | P | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | BW-1 | `operating-hours.test.ts` shared boundary | `assignSegmentForTime` | P0 | shipped |
| C2 | BW-2 | `slotUntilTime` wrap | `slotUntilTime` | P0 | shipped |
| C3 | BW-3 / FP-10 | `clampSlotIntervalMinutes` | same module | P0 | shipped |
| C4 | scheduling guest_note | `scheduling/schema.test.ts` | baseline + segment SQL | P0 | shipped |
| C5 | FP-10 schema | `branding/schema.test.ts` | `slot_interval_minutes` | P0 | shipped |
| C6 | BW-4 | `groupBookableSlots` | `groupBookableSlots` | P1 | shipped |
| C7 | BW-5 | `available-slots.test.ts` | `getAvailableSlots` | P1 | shipped |
| C8 | BW-6 | `segment-groups.test.ts` cards | reservation-widget | P1 | shipped |
| C9 | BW-7 | same file accordion/Réserver | reservation-widget | P1 | shipped |
| C10 | scheduling UI | `availability/actions.test.ts` | manager + upsert | P1 | shipped |
| C11 | FP-10 UI | `floor/slot-interval.test.ts` | floor-plan + branding action | P1 | shipped |
| C12 | BW-8 | messages-parity + chrome-i18n | messages + `useTranslations` | P2 | shipped |

**manual-UAT (deferred):** accordion/card visual (dark hero, hover, chevrons) and FR/EN overflow — not automated.

## Run metrics

- 12 criteria, all **unit**, all executed (not skipped).
- Known repo `tsc` failures outside this diff (`floor-plan` typing, missing `swr`, locale page) — not used as a pass for this loop.

## Residual findings

Merged at 4C into `docs/findings/{security,tech-debt,test-debt,product-gaps}.md`. Dropped in-run: ICU `guestsSummary` (C12). Adversarial leftovers: schema remotes, unbounded `guest_note`, fail-open vs fail-closed slots, source-regex widget tests. Filing: Linear propose-only (no tracked parent; operator confirmation required; cap 3 net-new; security floor med+).

## Reusable patterns (4E)

1. **Clock-face wrap before `minutesToTime`** — slot generation may *break* at 24h; until-badges must wrap.
2. **Inclusive membership vs exclusive assignment** — share a contains helper; exclusive ownership only in `assignSegmentForTime`.
3. **Source-structure widget contract** — `readFileSync` + regex pins helper consumption and `data-testid`s without mounting next-intl.
4. **Staff singleton settings** — fetch in admin RSC, pass clamped `initial*` into the client island; optimistic UI + rollback.

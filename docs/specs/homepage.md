# Homepage (hero & reservation)

**Status:** Draft  
**Last updated:** 2026-09-02

## Scope

Guest homepage layout at `/` (`app/[locale]/page.tsx`): the hero copy column
and the reservation widget. Header/nav: [site-chrome.md](./site-chrome.md).
Reservation booking rules: [booking-rules.md](./booking-rules.md).

## Acceptance criteria

1. **HP-1 — Hero and reservation side-by-side from `md` up** — The hero
   content column (`hero.tagline` / `hero.headline` and related copy) and the
   reservation-widget column (`id="reserve"`, `ReservationWidget`) MUST lay
   out side-by-side (grid or flex, two columns) from the `md` breakpoint up,
   and stack below `md`. They MUST NOT share a single `max-w-xl` column with
   no `md:` column split at every breakpoint.

## References

- `app/[locale]/page.tsx` (`grid gap-10 md:grid-cols-2 md:gap-12`; `#reserve`)
- `components/site/reservation-widget.tsx`
- `tests/unit/site/homepage-layout.test.ts` (HP-1 two-column md+ guard)
- [site-chrome.md](./site-chrome.md)
- [booking-rules.md](./booking-rules.md)

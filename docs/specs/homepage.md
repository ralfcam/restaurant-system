# Homepage (hero & reservation)

**Status:** Draft  
**Last updated:** 2026-09-09

## Scope

Guest homepage at `/` (`app/[locale]/page.tsx`): the hero copy column, the
reservation widget, and the Chef's picks section. Header/nav:
[site-chrome.md](./site-chrome.md). Reservation booking rules:
[booking-rules.md](./booking-rules.md). Chef's picks rows come from
`getHomepageChefsPicks` ([menu-availability.md](./menu-availability.md)).

## Acceptance criteria

1. **HP-1 — Hero and reservation side-by-side from `md` up** — The hero
   content column (`hero.tagline` / `hero.headline` and related copy) and the
   reservation-widget column (`id="reserve"`, `ReservationWidget`) MUST lay
   out side-by-side (grid or flex, two columns) from the `md` breakpoint up,
   and stack below `md`. They MUST NOT share a single `max-w-xl` column with
   no `md:` column split at every breakpoint.
2. **HP-2 — Chef's picks render without an SSR data-fetch flash** — The
   homepage seeds its Chef's picks section with server-fetched data —
   mirroring the `MenuPage`/`MenuBrowser` `initialItems` pattern — so
   `useChefsPicks` receives non-empty `initialData` on first paint instead
   of always starting from an empty client-only fetch.
3. **HP-3 — Chef's picks avatar never renders blank** — The featured-dish
   initial-letter avatar falls back to a visible character when the
   localized name is an empty string, instead of rendering `undefined`.

## Implementation trace (non-normative)

FEATURE `res-59_chefs_picks_ssr_avatar` (RES-59, 2026-09-09). HP-2 and HP-3
shipped. HP-1 layout JSX lives in the client leaf after the App Router split.

| Criterion | Shipped in                                                                                                                                                                                                                         | Tests                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| HP-1      | `components/site/home-page-client.tsx` (`grid gap-10 md:grid-cols-2 md:gap-12`; `#reserve`)                                                                                                                                        | `tests/unit/site/homepage-layout.test.ts` → HP-1 two-column md+ guard                                                                 |
| HP-2      | `app/[locale]/page.tsx` `await getHomepageChefsPicks()` → `<HomePageClient initialChefsPicks={…} />`; `useChefsPicks(initialChefsPicks)` + exported `ChefsPicksPayload` in `hooks/use-chefs-picks.ts` (MenuPage/MenuBrowser split) | `tests/unit/site/home-page-chefs-picks-ssr.test.ts` → "seeds useChefsPicks with server-fetched getHomepageChefsPicks data"            |
| HP-3      | `components/site/home-page-client.tsx` `{name.trim()[0] ?? "?"}` (empty/whitespace `str.trim()[0]` is `undefined`; no helper)                                                                                                      | `tests/unit/site/homepage-layout.test.ts` → "featured-dish avatar falls back to a visible character when the localized name is empty" |

## References

- `app/[locale]/page.tsx` (RSC seed: `getHomepageChefsPicks` → `HomePageClient`)
- `components/site/home-page-client.tsx` (`grid gap-10 md:grid-cols-2 md:gap-12`; `#reserve`; avatar `{name.trim()[0] ?? "?"}`)
- `hooks/use-chefs-picks.ts` (`ChefsPicksPayload`)
- `components/site/reservation-widget.tsx`
- `tests/unit/site/homepage-layout.test.ts` (HP-1 two-column md+; HP-3 avatar)
- `tests/unit/site/home-page-chefs-picks-ssr.test.ts` (HP-2 SSR seed)
- [site-chrome.md](./site-chrome.md)
- [booking-rules.md](./booking-rules.md)

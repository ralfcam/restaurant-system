# Standalone reservation widget

**Status:** Draft
**Last updated:** 2026-10-04

## Scope

Guests can open a standalone reservation page at `/[locale]/reserve`. The page centers the existing reservation widget. Availability, capacity, confirmation, grouped time cards, and the guests-then-date-then-time accordions stay in [booking-rules.md](./booking-rules.md) BW-6 and BW-7. The homepage layout in [homepage.md](./homepage.md) stays as it is. Logo and hero image uploads stay in [branding-cms.md](./branding-cms.md).

Staff who can edit branding (`requireSuperAdminUser` and the service-role client, the same gate as the hero image) can set `restaurant_settings` fields on row `id = 1`: `restaurant_display_name`, `tagline`, `welcome_title`, `welcome_message`, and `closing_message`, each nullable text, plus `show_reservation_phone`, a boolean defaulting to false. Address, phone, and `hero_image_url` already exist and are reused. Saved values persist across reload and render on `/[locale]/reserve`. Example sentences such as "Une table, des souvenirs à partager", "Bienvenue chez nous", and "Une cuisine de saison, des produits locaux..." are not hard-coded.

A null or blank `restaurant_display_name` renders no restaurant name. The page does not render the product name "Restaurant Link" as that name. A null or blank editorial field omits that block. Opening hours are the existing `operating_windows` rows, not a separate copy field. The address is `restaurant_settings.address`. The phone line renders only when `show_reservation_phone` is true and `phone` is non-blank. Otherwise the page renders no phone number, label, icon, or empty phone placeholder.

Out of this spec: a change to BW-6 or BW-7, a change to availability, capacity, or confirmation, a second hero-image upload, and replacing the homepage hero copy.

## Acceptance criteria

1. **SW-1 — Public page.** `GET /[locale]/reserve` renders the existing reservation widget with `data-testid="standalone-reserve"`. It does not implement a second slot generator. Unauthenticated guests can open it. The page is a single column at narrow widths and stays within a centered column from the `md` breakpoint up.

2. **SW-2 — Booking flow stays.** The widget on this page still uses the BW-7 accordions in the order guests, date, then time, and the BW-6 grouped slot cards. Réserver, availability, capacity, and confirmation behave as they do on the homepage widget.

3. **SW-3 — Editorial fields.** A `super_admin` can save `restaurant_display_name`, `tagline`, `welcome_title`, `welcome_message`, and `closing_message` from `/admin/settings` with `data-testid="widget-page-editor"`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-super-admin caller cannot save them. After reload, `/[locale]/reserve` shows the saved text. A blank value omits that block. Those example sentences do not appear in source as default copy.

4. **SW-4 — Name.** When `restaurant_display_name` is non-blank, the page shows that trimmed value as the restaurant name. When it is null or blank, the page shows no restaurant name and does not show "Restaurant Link" in that place.

5. **SW-5 — Hero, hours, and address.** The page shows `hero_image_url` when it is set and shows no broken image when it is null. Opening hours listed on the page match `operating_windows`. A non-blank address is shown. A null address omits the address line.

6. **SW-6 — Phone visibility.** `show_reservation_phone` defaults to false. When it is false, or when `phone` is null or blank, the page renders no phone number, label, icon, or empty placeholder. When it is true and `phone` is non-blank, that phone is shown. Turning it off leaves the hours and address in place.

## Implementation trace (non-normative)

FEATURE `res-118_standalone_widget_2491` (RES-118, 2026-10-04). SW-1–SW-6 shipped. `app/[locale]/reserve/page.tsx` is unauthenticated: `setRequestLocale`, then `createServiceClient` loads `restaurant_settings` id `1` and `operating_windows` (`opens_at`, `closes_at`). The page is `<main className="mx-auto max-w-xl md:max-w-2xl" data-testid="standalone-reserve">` with `StandaloneReservePage` and `<ReservationWidget phone={widgetPhone} />`. `widgetPhone` is the trimmed phone only when `show_reservation_phone === true` and that trim is non-empty; otherwise `""`, because `ReservationWidget`'s `phone` defaults to `RESTAURANT.phone` only when the prop is omitted. No second slot generator; guests, date, then time accordions and `slot-card` / `slot-group` stay in `components/site/reservation-widget.tsx`. `updateStandaloneWidgetCopy` in `app/actions/widget-page.ts` calls `requireSuperAdminUser` before `createServiceClient`. A null user returns `{ error: "unauthorized" }` and does not upsert. `storedText` trims and stores a blank string as null. The upsert is `restaurant_settings` with `id: 1`, `updated_at`, and `show_reservation_phone: Boolean(input.show_reservation_phone)`. `components/staff/widget-page-editor.tsx` is a client form with `data-testid="widget-page-editor"`. It submits `restaurant_display_name`, `tagline`, `welcome_title`, `welcome_message`, `closing_message`, and `show_reservation_phone` through `updateStandaloneWidgetCopy`. `app/admin/settings/page.tsx` renders `<WidgetPageEditor />`. Baseline `ADD COLUMN IF NOT EXISTS` adds nullable text `restaurant_display_name`, `tagline`, `welcome_title`, `welcome_message`, and `closing_message`, and `show_reservation_phone BOOLEAN NOT NULL DEFAULT false`. `StandaloneReservePage` omits a copy block when `visibleCopy` is null (null or whitespace). The display name is that trimmed value in `data-testid="widget-restaurant-display-name"`, or no node and no "Restaurant Link". The hero is a plain `<img src={heroSrc} alt="" data-testid="widget-hero">` when `hero_image_url` trims to a non-empty string, and no image when it does not. Hours render as `data-testid="widget-hours"` from the passed windows. A non-null `address` renders `data-testid="widget-address"`; null omits it. `data-testid="widget-phone"` renders only when the flag is true and the trimmed phone is non-empty; the flag defaults to false. Hours and address stay when the phone is hidden.

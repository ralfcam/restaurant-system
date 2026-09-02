# Branding CMS (admin-managed logo)

**Status:** Draft  
**Last updated:** 2026-09-02

## Scope

Minimal content-management surface for guest-facing brand content. The first
managed asset is the restaurant logo. The template ships with **no bundled
logo**. Staff upload or remove a mark from `/admin/settings` or the
staff-sidebar brand dialog. Without a custom logo, every surface shows the
restaurant name only.

## Acceptance criteria

1. **BC-1 — Settings singleton** — Schema defines `restaurant_settings` as a
   single row (`id = 1`) with nullable `logo_url`. Guests may `SELECT`; writes
   go through staff-authenticated server actions (service role). A public
   `branding` storage bucket holds `logo.{png,jpg,svg,webp}` (max 2MB).

2. **BC-2 — Super-admin-only writes** — `uploadRestaurantLogo` and
   `removeRestaurantLogo` reject callers who are not super_admin
   (`Unauthorized`), including unauthenticated callers and authenticated
   staff-only callers without the super_admin claim (see
   [staff-authorization.md](./staff-authorization.md) SA-7/SA-8).
   `getRestaurantLogoUrl` is public (guest chrome + login need it).

3. **BC-3 — Upload validation** — Rejects missing files, types other than
   PNG / JPEG / SVG / WEBP, and files larger than 2MB. Messages:
   "Please choose an image file.", "Please upload a PNG, JPG, SVG, or WEBP
   image.", "Logo image must be smaller than 2MB."

4. **BC-4 — Persist and display** — A successful upload stores the object,
   writes a cache-busted public URL to `restaurant_settings.logo_url`, and
   that URL is what the guest header, staff login, and staff sidebar render
   via `BrandMark`. With no URL, `BrandMark` renders nothing.

5. **BC-5 — Empty default / remove logo** — Removing the custom logo deletes
   stored `logo.*` objects, nulls `logo_url`, and every surface shows the
   restaurant name only (no bundled `/images/logo.png`).

6. **BC-6 — Revalidate surfaces** — Upload and remove revalidate staff
   (`/admin` layout, `/admin/settings`, `/pos`, `/kds`), guest (`/`, `/menu`,
   `/en`, `/en/menu`), and `/auth/login`.

7. **BC-7 — Admin CMS page** — `/admin/settings` is a staff-gated Branding
   page that hosts the logo editor. The sidebar brand mark remains a shortcut
   to the same editor. Neither page ships leftover `public/test-logo-*.png`
   fixtures.

8. **BC-8 — Upload payload size** — The logo is sent as a base64 string on a
   Server Action (not multipart). `next.config` sets
   `experimental.serverActions.bodySizeLimit` to `4mb` so a file at the 2MB
   validation cap still fits after base64 + RSC framing. The default 1MB
   limit must not reject a valid logo.

9. **BC-9 — Type aliases and missing bucket** — `image/jpg` (and other JPEG /
   PNG aliases) and an empty browser `type` with a `.png` / `.jpg` / `.svg` /
   `.webp` file name are accepted. If the public `branding` bucket is missing
   at upload time, the action creates it (public, 2MB, allowed image MIME
   types) and then stores the object.

## References

- `app/admin/settings/page.tsx`
- `app/actions/branding.ts`
- `lib/branding.ts`
- `components/staff/restaurant-logo-editor.tsx`
- `components/staff/sidebar-logo-manager.tsx`
- `hooks/use-restaurant-logo.ts`
- [site-chrome.md](./site-chrome.md) (empty-by-default mark + custom override)
- [../architecture/Auth-And-RLS.md](../architecture/Auth-And-RLS.md)

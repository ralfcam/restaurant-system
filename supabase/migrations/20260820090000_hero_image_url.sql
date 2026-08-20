-- Adds hero_image_url to the restaurant_settings CMS singleton, mirroring
-- logo_url. Nullable, defaults to NULL (no custom hero photo) so the
-- homepage hero renders a blank background until an admin uploads one.
alter table public.restaurant_settings
  add column if not exists hero_image_url text;

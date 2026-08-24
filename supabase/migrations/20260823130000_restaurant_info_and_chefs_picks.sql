alter table public.restaurant_settings
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists chefs_picks_enabled boolean not null default true;

comment on column public.restaurant_settings.address is
  'Optional CMS override for the guest-facing restaurant address.';
comment on column public.restaurant_settings.phone is
  'Optional CMS override for the guest-facing reservation phone number.';
comment on column public.restaurant_settings.chefs_picks_enabled is
  'Controls whether popular menu items may appear in the homepage chef picks section.';

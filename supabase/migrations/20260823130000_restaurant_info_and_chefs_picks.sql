alter table public.restaurant_settings
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists chefs_picks_enabled boolean not null default true,
  -- FP-10: restaurant-wide guest booking slot interval (15 / 30 / 60).
  add column if not exists slot_interval_minutes int not null default 30;

do $$
begin
  alter table public.restaurant_settings
    add constraint restaurant_settings_slot_interval_minutes_check
    check (slot_interval_minutes IN (15, 30, 60));
exception
  when duplicate_object then null;
end $$;

comment on column public.restaurant_settings.address is
  'Optional CMS override for the guest-facing restaurant address.';
comment on column public.restaurant_settings.phone is
  'Optional CMS override for the guest-facing reservation phone number.';
comment on column public.restaurant_settings.chefs_picks_enabled is
  'Controls whether popular menu items may appear in the homepage chef picks section.';
comment on column public.restaurant_settings.slot_interval_minutes is
  'Restaurant-wide guest booking slot interval in minutes. Allowed: 15, 30, 60; default 30.';

alter table public.restaurant_settings
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists chefs_picks_enabled boolean not null default true,
  -- FP-10: restaurant-wide guest booking slot interval (15 / 30 / 60).
  add column if not exists slot_interval_minutes int not null default 30,
  -- REAZED-309: occupancy duration + safety buffer (BW-11 clamps).
  add column if not exists occupancy_duration_minutes int not null default 90,
  add column if not exists safety_buffer_minutes int not null default 15;

do $$
begin
  alter table public.restaurant_settings
    add constraint restaurant_settings_slot_interval_minutes_check
    check (slot_interval_minutes IN (15, 30, 60));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.restaurant_settings
    add constraint restaurant_settings_occupancy_duration_minutes_check
    check (
      occupancy_duration_minutes BETWEEN 30 AND 240
      AND occupancy_duration_minutes % 15 = 0
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.restaurant_settings
    add constraint restaurant_settings_safety_buffer_minutes_check
    check (
      safety_buffer_minutes BETWEEN 0 AND 60
      AND safety_buffer_minutes % 5 = 0
    );
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
comment on column public.restaurant_settings.occupancy_duration_minutes is
  'Restaurant-wide occupancy duration in minutes. 30–240 step 15; default 90.';
comment on column public.restaurant_settings.safety_buffer_minutes is
  'Restaurant-wide safety buffer in minutes after occupancy. 0–60 step 5; default 15.';

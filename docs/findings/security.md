# Security findings (open)

- [ ] Unbounded `guest_note` · `components/staff/scheduling-manager.tsx` / `upsertOperatingWindows` · no `maxLength` or Zod cap; public widget renders the column; a huge string can ship to guests · med · (found: C10/refactor)
- [ ] Mixed clients for the same settings row · `app/actions/menu.ts` (`createClient`) vs branding/restaurant-info (`createServiceClient`) · staff writes to `restaurant_settings` are not on one auth path · med · (found: C11/red)

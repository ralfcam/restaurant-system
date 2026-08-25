# Security findings (open)

- [ ] Mixed clients for the same settings row · `app/actions/menu.ts` (`createClient`) vs branding/restaurant-info (`createServiceClient`) · staff writes to `restaurant_settings` are not on one auth path · med · (found: C11/red)

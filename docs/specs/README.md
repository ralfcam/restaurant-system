# Specs

Acceptance criteria for restaurant-system. Each spec is the **source of truth** for
`/sdd-to-tdd`, `/review`, and `/audit`.

| Spec                                           | Status | Summary                                                                                                                                                                                         |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [booking-rules.md](./booking-rules.md)         | Draft  | Online reservations, party limits, blocked dates                                                                                                                                                |
| [menu-availability.md](./menu-availability.md) | Draft  | Menu items, 86'd dishes, guest vs staff visibility                                                                                                                                              |
| [scheduling.md](./scheduling.md)               | Draft  | Staff scheduling, floor plan, table status                                                                                                                                                      |
| [site-chrome.md](./site-chrome.md)             | Draft  | Guest header, optional logo (empty by default), shared nav on `/` and `/menu`                                                                                                                   |
| [branding-cms.md](./branding-cms.md)           | Draft  | Minimal CMS: admin-managed restaurant logo                                                                                                                                                      |
| [dev-toolchain.md](./dev-toolchain.md)         | Draft  | Dev gates: G-T1 typecheck, G-L1 lint (`eslint.config.mjs`; gitignored supabase CLI temp/branches in `globalIgnores`), G-F1 Prettier (`format` / `format:check`; snapshot trees prettierignored) |

When adding a spec: kebab-case filename, testable acceptance criteria, link from
[../README.md](../README.md).

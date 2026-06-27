# Dev toolchain

**Status:** Draft  
**Last updated:** 2026-06-27

## Scope

Project-wide development gates referenced by `/sdd-to-tdd`, `/review`, and
[`docs/testing/Pyramid-Overview.md`](../testing/Pyramid-Overview.md):
`pnpm lint`, `pnpm typecheck`.

## Acceptance criteria

1. **G-T1 — Typecheck clean** — `pnpm typecheck` exits 0 project-wide.
   `@base-ui/react` dialog triggers use `render` composition, not Radix-style
   `asChild`. Regression guard: `components/site/reservation-widget.tsx` must
   not pass `asChild` to `DialogTrigger`.

2. **G-L1 — Lint gate operational** — `eslint` and `eslint-config-next` are in
   `devDependencies`; a flat ESLint config exists at the repo root
   (`eslint.config.mjs`). `pnpm lint` exits 0 with zero warnings
   (`--max-warnings 0`).

## References

- [`package.json`](../../package.json)
- [`components/ui/dialog.tsx`](../../components/ui/dialog.tsx) — Base UI `render` pattern
- [`components/site/reservation-widget.tsx`](../../components/site/reservation-widget.tsx)
- [`docs/runbooks/deploy.md`](../runbooks/deploy.md)

# Dev toolchain

**Status:** Draft  
**Last updated:** 2026-09-01

## Scope

Project-wide development gates referenced by `/sdd-to-tdd`, `/review`, and
[`docs/testing/Pyramid-Overview.md`](../testing/Pyramid-Overview.md):
`pnpm lint`, `pnpm typecheck`, `pnpm exec prettier` / `pnpm format`.

## Acceptance criteria

1. **G-T1 — Typecheck clean** — `pnpm typecheck` exits 0 project-wide.
   `@base-ui/react` dialog triggers use `render` composition, not Radix-style
   `asChild`. Regression guard: `components/site/reservation-widget.tsx` must
   not pass `asChild` to `DialogTrigger`.
   - Declared imports used by live hooks (including `swr`) must resolve on
     disk so TypeScript can load the module (`node_modules/swr` present when
     `package.json` / the lockfile declare `swr`).
   - Homepage Chef’s picks items are `MenuItemRow` (the hook return and/or
     `useSWR` generic types `items` as `MenuItemRow[]`; the homepage map
     callback is not an implicit `any`).
   - Live floor table view types used with `spreadOverlappingTables` include
     persisted grid fields `id` (string), `x`, and `y` (numbers), matching
     FP-9 in [`scheduling.md`](scheduling.md).
   - Next.js production build MUST NOT ignore TypeScript errors.
     `next.config.mjs` MUST NOT set `typescript.ignoreBuildErrors` to a
     truthy value (the key may be omitted — Next.js defaults to failing
     the build — or set to `false`). A tree whose `pnpm typecheck` exits
     0 MUST NOT satisfy G-T1 if `next build` is configured to skip
     TypeScript errors.

2. **G-L1 — Lint gate operational** — `eslint` and `eslint-config-next` are in
   `devDependencies`; a flat ESLint config exists at the repo root
   (`eslint.config.mjs`). `pnpm lint` exits 0 with zero warnings
   (`--max-warnings 0`).
   - `package.json` `scripts.lint` MUST include the ESLint CLI flag `--max-warnings 0`.
     A tree that happens to have zero warnings MUST NOT satisfy G-L1 if that flag
     is absent from the lint script.
   - Generated Supabase CLI output that `.gitignore` already excludes
     (`supabase/.temp/**` and `supabase/.branches/**`) MUST be listed in
     `eslint.config.mjs` `globalIgnores`. `pnpm lint` (`eslint .`) MUST NOT lint
     those trees. A local `npx supabase start` that writes `supabase/.temp/**`
     MUST NOT fail the lint gate.
   - **G-L1 C3 — Lint gate behaviorally rejects unused disable directives** —
     `eslint.config.mjs` MUST set `linterOptions.reportUnusedDisableDirectives`
     to an error-level value (`"error"`) rather than relying on the ESLint
     default. An `eslint-disable` comment that suppresses no actual violation
     MUST be reported at error severity (2), not merely a warning-level
     default that could silently change across ESLint major versions (it
     already changed once, v8 `false` → v9 `"warn"`). The regression guard in
     `tests/unit/dev-toolchain/lint-toolchain.test.ts` MUST assert the actual
     ESLint-reported severity for a known unused-disable-directive input via
     the ESLint Node API — a test that only checks config/dependency
     existence MUST NOT satisfy this criterion.

3. **G-F1 — Prettier is a repo tool** — `prettier` is in `devDependencies`.
   `pnpm exec prettier` resolves. `package.json` `scripts.format` MUST include
   `prettier --write`; `scripts.format:check` MUST include `prettier --check`.
   Repo-root Prettier config MUST set `semi: false` so TypeScript matches the
   existing no-semicolon style. `.prettierignore` MUST exclude snapshot trees
   `docs/verifier-reports` and `docs/findings/runs` (and `docs/eval` when
   present).

## Implementation trace (non-normative)

| Criterion | Shipped in                                                                                                                                                                   | Tests                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| G-T1 C1   | `package.json` / `pnpm-lock.yaml` declare `swr@2.5.1`; `node_modules/swr` on disk (no app source)                                                                            | `tests/unit/dev-toolchain/typecheck-toolchain.test.ts` → "swr is installed so TypeScript can resolve the module"   |
| G-T1 C2   | `hooks/use-chefs-picks.ts` (`items: MenuItemRow[]`); `app/[locale]/page.tsx` (`featured.map((item: MenuItemRow)`)                                                            | `tests/unit/site/chefs-picks-types.test.ts` → "homepage chefs picks map callback is MenuItemRow"                   |
| G-T1 C3   | `lib/reservations/auto-assign.ts` — `FloorTableView` includes `id: string`, `x: number`, `y: number`; `AssignableTable` stays x/y-free                                       | `tests/unit/floor/layout.test.ts` → "floor table view type includes id x y for spreadOverlappingTables"            |
| G-T1 C4   | `next.config.mjs` (`typescript` key omitted; Next default fail-closed)                                                                                                       | `tests/unit/dev-toolchain/typecheck-toolchain.test.ts` → "next config does not ignore TypeScript build errors"     |
| G-L1 C1   | `eslint.config.mjs` `globalIgnores` (`supabase/.temp/**`, `supabase/.branches/**`)                                                                                           | `tests/unit/dev-toolchain/lint-toolchain.test.ts` → "ignores gitignored supabase CLI temp and branches trees"      |
| G-L1 C2   | `package.json` `scripts.lint` (`eslint . --max-warnings 0`)                                                                                                                  | `tests/unit/dev-toolchain/lint-toolchain.test.ts` → "lint script passes --max-warnings 0 to eslint"                |
| G-L1 C3   | `eslint.config.mjs` `linterOptions.reportUnusedDisableDirectives: "error"`                                                                                                   | `tests/unit/dev-toolchain/lint-toolchain.test.ts` → "errors (not warns) on an unused eslint-disable directive"     |
| G-F1      | `package.json` `prettier` + `scripts.format` / `scripts.format:check`; `.prettierrc.json` (`semi: false`); `.prettierignore` (`docs/verifier-reports`, `docs/findings/runs`) | `tests/unit/dev-toolchain/format-toolchain.test.ts` → "prettier is installed with format and format:check scripts" |

## References

- [`package.json`](../../package.json)
- [`next.config.mjs`](../../next.config.mjs)
- [`components/ui/dialog.tsx`](../../components/ui/dialog.tsx) — Base UI `render` pattern
- [`components/site/reservation-widget.tsx`](../../components/site/reservation-widget.tsx)
- [`docs/runbooks/deploy.md`](../runbooks/deploy.md)

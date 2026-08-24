# TDD verifier report — G-T1 typecheck fix (`g-t1_typecheck_fix_47606513`)

FIX run. Free-text `bug:` — no Linear ID. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict.

## Criterion close-outs (incremental)

### C1 — SWR module resolves

Suggested review order: `[toolchain]` `package.json` `swr` → lockfile → `node_modules/swr/package.json` (`existsSync`)

Reusable pattern: declared-dep existsSync for TS2307

### C2 — Homepage Chef’s picks MenuItemRow

Suggested review order: `[public-api]` `useChefsPicks` (`ChefsPicksPayload` + `items: MenuItemRow[]`) → homepage `featured.map((item: MenuItemRow)`

Reusable pattern: When a source-regex allows `useSWR<… items: T[]>` or `function useX(…): { items: T[] }`, a named SWR generic still needs a **literal** `items: T[]` on the function return type.

### C3 — Floor table view includes grid

Suggested review order: `[floor]` `FloorTableView` ∩ `{ id: string; x: number; y: number }` → overlay `as FloorTableView<T>` → `spreadOverlappingTables(loadedTables)`

Reusable pattern: C3-style source-regex tests require `id: string` / `x: number` / `y: number` as literals inside the `FloorTableView` object body; keep `AssignableTable` x/y-free so auto-assign helpers stay valid.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Toolchain [toolchain]

- `package.json` / `pnpm-lock.yaml` declare `swr@2.5.1`; `node_modules/swr/package.json` must exist so `tsc` can resolve the module
- Pin: `tests/unit/dev-toolchain/typecheck-toolchain.test.ts` — `swr is installed so TypeScript can resolve the module`

### 2. Public API [public-api]

- `hooks/use-chefs-picks.ts` — `ChefsPicksPayload`, explicit `items: MenuItemRow[]` return, `useSWR<ChefsPicksPayload>`
- `app/[locale]/page.tsx` — `import type { MenuItemRow }`; `featured.map((item: MenuItemRow)`
- Pins: `tests/unit/site/chefs-picks-types.test.ts`

### 3. Floor [floor]

- `lib/reservations/auto-assign.ts` — `FloorTableView` requires `id`/`x`/`y`; `AssignableTable` stays optional-id / no grid; overlay still `as FloorTableView<T>`
- `spreadOverlappingTables` in `lib/floor/layout.ts` (`T extends FloorCell & { id: string; label: string }`)
- Pin: `tests/unit/floor/layout.test.ts` — `floor table view type includes id x y for spreadOverlappingTables`

## Traceability (final)

| ID  | Spec               | Test                                                                                 | Source                                               | P   | Status  |
| --- | ------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------- | --- | ------- |
| C1  | G-T1 (swr resolve) | `typecheck-toolchain.test.ts::swr is installed so TypeScript can resolve the module` | `package.json` / `node_modules/swr`                  | P0  | shipped |
| C2  | G-T1 (MenuItemRow) | `chefs-picks-types.test.ts::homepage chefs picks map callback is MenuItemRow`        | `hooks/use-chefs-picks.ts`, `app/[locale]/page.tsx`  | P0  | shipped |
| C3  | G-T1 + FP-9 types  | `layout.test.ts::floor table view type includes id x y for spreadOverlappingTables`  | `lib/reservations/auto-assign.ts` (`FloorTableView`) | P0  | shipped |

**manual-UAT (deferred):** none

## Run metrics

- 3 criteria, all **unit**, all executed (not skipped).
- C1 Green: `pnpm install` materialized declared `swr@2.5.1` (`Packages: +2`).
- After C3: `pnpm typecheck` (`tsc --noEmit`) exit 0 (G-T1).
- `pnpm lint` exit 0 with 1 pre-existing warning (`.cursor/checks/harness-lint.mjs` unused `dirname`); G-L1 `--max-warnings 0` already archived as REAZED-272.
- Prettier is not a repo dependency (`pnpm exec prettier` not found); not added.

## Residual findings

Merged at 4C into `docs/findings/{tech-debt,test-debt,product-gaps}.md`. Dropped as already archived: G-L1 `--max-warnings 0` (REAZED-272), `typescript.ignoreBuildErrors` (REAZED-278). Filing: no tracked parent; floor is high-only for non-security; operator confirmation required for net-new issues.

## Reusable patterns (4E)

1. **declared-dep existsSync for TS2307** — pin `package.json` + lockfile + `existsSync(node_modules/<pkg>/package.json)`.
2. **Literal `items: T[]` on hook return** — a named SWR generic does not satisfy a source-regex that looks for `items: MenuItemRow[]` after `): {`.
3. **Grid fields inline on the view type** — `FloorTableView` must spell `id: string` / `x: number` / `y: number`; `AssignableTable` stays x/y-free for assignment helpers.

# Dev journal

Chronological notes when a `.cursor/plans/*.plan.md` completes or a milestone ships.

- **Restaurant Link template + empty default logo** (2026-08-18) — Rebrand from äkta; `menu-catalog` rename; no bundled `/images/logo.png`; `BrandMark` null until staff upload.
- **G-T1 typecheck fix** (`g-t1_typecheck_fix_47606513`) (2026-08-25) — `pnpm typecheck` exits 0; declared `swr` on disk; Chef’s picks `MenuItemRow`; `FloorTableView` includes `id`/`x`/`y`.
- **OH-SAVE** (2026-08-25) — `20260818162000_operating_hour_segments` recorded on linked remote `tilcqrudqxznnpepxjqq` (not a full `db push`); staff save via `replace_operating_windows`.
- **OH-SAVE isolation + complete-replace pin** (`pr35_coderabbit_oh_save`) (2026-08-25) — CodeRabbit fix on PR 35: mutating integration coverage now fails closed to local Supabase only (`assertIsolatedHoursMutationTarget`, `lib/scheduling/hours-mutation-target.ts`) instead of running against the deployed linked project; strengthened the RPC pin to assert an exact complete-replace multiset; deployed PGRST202 stays manual-UAT.
- **G-L1 temp ignore** (`g-l1_temp_ignore_da077232`) (2026-08-25) — `eslint.config.mjs` `globalIgnores` lists gitignored `supabase/.temp/**` and `supabase/.branches/**` so `pnpm lint` does not lint generated Supabase CLI output.
- **G-L1 max-warnings** (`reazed-272_lint_max_warnings`) (2026-08-25) — `package.json` `scripts.lint` is `eslint . --max-warnings 0` so warnings fail `pnpm lint`; unused `dirname` import dropped from `.cursor/checks/harness-lint.mjs`.

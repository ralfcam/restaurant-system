# Tech-debt findings (open)

- [ ] ESLint ignores are not derived from `.gitignore` · `eslint.config.mjs` vs `.gitignore` · C1 pins two supabase globs; any new gitignored generated tree can still fail `eslint .` until copied into `globalIgnores` · med · (seen: /triage 2026-08-26) (found: C1/red)
- [ ] Restore comment says "linked hours table" · `tests/integration/scheduling/replace-operating-windows.integ.test.ts:65` · after the isolation guard the suite must refuse non-local targets, so the comment can mislead a reviewer into thinking this file still mutates the shared project · low · (seen: /triage 2026-08-26) (found: tdd/pr35_coderabbit_oh_save/C2/refactor)
- [ ] Throw text omits the rejected host · `lib/scheduling/hours-mutation-target.ts:30` · CI/operator diagnosis is a generic message · low · (seen: /triage 2026-08-26) (found: tdd/pr35_coderabbit_oh_save/C1/refactor)

# Security findings (open)

- [ ] Prefix-only work-order path is not normalized · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:95` · `startsWith(".cursor/plans/")` would treat `.cursor/plans/../lib/billing/foo.ts` as process-meta; GitHub paths are usually repo-relative without `..`, but the gate would skip a crafted path · low · (found: tdd/pr118_cr_gcr3_plan_th_a422e8f1/C1/refactor)

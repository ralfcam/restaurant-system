# Findings ledger

Open out-of-scope discoveries from `/sdd-to-tdd` runs. **Active files hold open items only.**
After an item is filed to Linear (`REAZED-###`), move it to [archive.md](./archive.md).

| File | Category |
| --- | --- |
| [security.md](./security.md) | Security smells, auth/RLS gaps |
| [tech-debt.md](./tech-debt.md) | Refactors, duplication, dead code |
| [test-debt.md](./test-debt.md) | Missing/flaky/skipped coverage |
| [product-gaps.md](./product-gaps.md) | Spec↔product mismatches |

Entry format (one line per open item):

```markdown
- [ ] <title> · <file:line/area> · <why it matters> · <severity> · (found: <REAZED-###>/<criterion>/<phase>)
```

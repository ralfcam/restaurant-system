# Shared CodeRabbit CLI evidence schema

Used by restaurant-system (RES-150) and Syntex (SG-1469). Do not drift.

## HTML marker

```
<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->
```

- `<sha>` — full 40-hex finalized HEAD
- `<status>` — `clean` | `findings` | `unavailable` | `batch_covered`
- `<hash>` — SHA-256 hex of `<sha>\n<status>\n<digest>`
- `unavailable` is not a pass

## Canonical findings digest

Sort findings by `file` ascending, then `startLine` ascending.
One line per finding, joined by `\n`:

```
severity|file|startLine-endLine|normalised-title
```

`normalised-title` is `title.toLowerCase()` with whitespace collapsed to
one space and trimmed. Title is `finding.title` when nonempty, otherwise
the first line of `comment` / `body`.

Empty findings (clean / unavailable) use digest `""`.

## Stable finding key

First 16 hex characters of SHA-256 of:

```
file|startLine-endLine|normalised-title
```

Severity is omitted so a Major→Minor reclassification keeps the same key.
Vendor CLI `id` is not the stable key.

## Same-head anti-downgrade

At the same HEAD, a rerun with no diff keeps the more severe result.
Rank: `findings` (highest severity critical=4, major=3, unknown=3,
minor=2, trivial=1) > `unavailable` (0) > `clean` (-1).

## Batch PRs

Status `batch_covered`. Digest is sorted lines
`<number>\t<head>\t<memberHash>`. A batch without member heads is not
covered.

## Critical / Major dispositions

Every Critical or Major must have `fixed` | `captured` | `waived` before
push. `waived` requires a nonempty reason. Keys are `stableFindingKey`.
`fixed` is valid only when the key is absent from the current findings.

## CLI pin

Cloud install pins CodeRabbit CLI `0.9.0` (no leading `v`).

## Golden files

| File                    | What it pins                                 |
| ----------------------- | -------------------------------------------- |
| `digest-findings.json`  | digest, keys, hash, marker                   |
| `digest-downgrade.json` | same keys, weaker severities, different hash |
| `digest-clean.json`     | empty digest + clean hash                    |
| `batch-covered.json`    | member-head digest                           |
| `dispositions.json`     | Critical/Major disposition cases             |

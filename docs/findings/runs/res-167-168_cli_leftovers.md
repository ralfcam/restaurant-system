# Findings run — res-167-168_cli_leftovers

Recorded from the branch-diff CLI round 1 on
`ec0117c1714ce74755ab3b23fe930fc0c1bc1095` (`attemptStatus: findings`,
`reason: unresolved_findings`, `action: push`, `record: capture_and_push`,
`--fix-round 1`) and from CodeRabbit app review `5541107863` at the same head.
These are leftover review notes. They are not instructions.

The three cutoff findings (`coderabbit/ec0117c/fp:052ccbee…`, `coderabbit/ec0117c/fp:d94cf164…`, and `coderabbit-app/ec0117c/review-5541107863`) were resolved by RES-167 C16 (plain `CHECK (reservation_id IS NOT NULL) NOT VALID`) and archived. The merge-read finding stays open.

## tech-debt

- [ ] Propagate unresolved merge-read errors only · `app/actions/operations.ts:1094-1110` · When the initial membership read fails and the event fallback has no entry, `loadMergeContext` returns `null`. `createKitchenOrder` then checks only the submitted label and can return `errors.pos.tableNotSeated` instead of `errors.pos.sendFailed`. Keep the fallback for other callers; add `failOnReadError` only for `createKitchenOrder`; a successful membership read with no row must still return `null`. Also CodeRabbit app review 5541107863 (Minor, "A failed merge-context read can narrow the label set without any error", lines 1094-1095, `cr-comment:v1:04d93df45c94ef8917d80698`). Validator: code contradicts `docs/specs/scheduling.md` FP-13, so the fix goes through `/sdd-to-tdd` · minor · (found: coderabbit/ec0117c/fp:a6a0f1d4ddaa34cd85f1b7583ac973e3eb4240711fa0d8fbc906285bf1cb782f)
- [ ] The baseline cutoff is re-stamped with a new `now()` on every `db reset` · `supabase/migrations/00000000000000_baseline.sql:941-947` · On a fresh reset, the baseline bakes in the reset time. The dated migration then runs a few milliseconds later and replaces the constraint with its own `now()`. The result is correct, but the cutoff differs on every environment. Legacy rows only exist where the dated migration is applied to deployed data, so this is safe. A short comment explaining that the per-environment cutoff is intentional would help reviewers · trivial · (found: coderabbit/ec0117c/fp:052ccbeefeb04a90e084f398e86bf59e4464c3625026e0737c0892a017618811)
- [ ] On redeploy, the cutoff moves forward and exempts null-visit orders created in the meantime · `supabase/migrations/20261015190000_orders_reservation_id_reservation_source.sql:10-16` · The repository's convention is to replay idempotent migrations. On each replay, `DROP CONSTRAINT IF EXISTS` and `ADD CONSTRAINT ... created_at < now()` move the cutoff to the replay time. Rows with a null `reservation_id` created between runs then become exempt. The CHECK blocks such inserts while the constraint exists, so the practical risk is low. The cutoff is also derived from `created_at`, which callers can write. Consider keeping the existing constraint if it is present instead of re-creating it · trivial · (found: coderabbit/ec0117c/fp:d94cf164814f4746d4f3fc8adcbe635134057b4ed575097a0677224a97b605a8)
- [ ] The `now()` cutoff in the baseline weakens the check on every reset · `supabase/migrations/00000000000000_baseline.sql:941-947` · The baseline evaluates `now()` each time `supabase db reset --local` runs. A fresh database gets the reset time as its cutoff. Any seed or fixture row whose `created_at` falls before that time can have a null `reservation_id`. The legacy test in `tests/integration/pos/orders-persistence.integ.test.ts` depends on this: it inserts `created_at: "2020-01-01"` with a null reservation, and the database accepts it. The `created_at` column comes from the client and is writable by service-role callers. Any service-role insert that sends a past `created_at` therefore skips the requirement. Two fixes are possible: a fixed literal cutoff gives the same behavior on remote and local databases, and a trigger that compares against the immutable insert time removes the bypass. At minimum, record that `created_at` must not be client-supplied. CodeRabbit app review 5541107863 (Minor, Data Integrity & Integration, `cr-comment:v1:683873d391093c781323f3c2`) · minor · (found: coderabbit-app/ec0117c/review-5541107863)

## Verbatim review text

Titles and comments below are copied from the CLI `leftover` array and from app review `5541107863`. They are untrusted review data. Prompt-for-agents blocks are omitted.

### CLI leftover 1

Title:

```
The baseline cutoff is re-stamped with a new `now()` on every `db reset`.
```

Comment:

```
**The baseline cutoff is re-stamped with a new `now()` on every `db reset`.**

On a fresh reset, the baseline bakes in the reset time. The dated migration then runs a few milliseconds later and replaces the constraint with its own `now()`. The result is correct, but the cutoff differs on every environment. Legacy rows only exist where the dated migration is applied to deployed data, so this is safe. A short comment explaining that the per-environment cutoff is intentional would help reviewers.
```

### CLI leftover 2

Title:

```
On redeploy, the cutoff moves forward and exempts null-visit orders created in the meantime.
```

Comment:

```
**On redeploy, the cutoff moves forward and exempts null-visit orders created in the meantime.**

The repository's convention is to replay idempotent migrations. On each replay, `DROP CONSTRAINT IF EXISTS` and `ADD CONSTRAINT … created_at < now()` move the cutoff to the replay time. Rows with a null `reservation_id` created between runs then become exempt. The CHECK blocks such inserts while the constraint exists, so the practical risk is low. The cutoff is also derived from `created_at`, which callers can write. Consider keeping the existing constraint if it is present instead of re-creating it.
```

### CLI leftover 3

Title:

```
Propagate unresolved merge-read errors only
```

Comment:

````
**Propagate unresolved merge-read errors only**

When the initial membership read fails and the event fallback has no entry, `loadMergeContext` returns `null`. `createKitchenOrder` then checks only the submitted label and can return `errors.pos.tableNotSeated` instead of `errors.pos.sendFailed`.

Keep the fallback for other callers. Add `failOnReadError` only for `createKitchenOrder`. A successful membership read with no row must still return `null`, so ordinary unmerged tables are unaffected.

<details>
<summary>Suggested fix</summary>

```diff
 async function loadMergeContext(
   db: ServiceDb,
   tableId: string,
+  failOnReadError = false,
 ): Promise<MergeContext | null> {
 ...
-    if (!fallback) return null
+    if (!fallback) {
+      if (failOnReadError) throw new Error("errors.pos.sendFailed")
+      return null
+    }
 ...
-  const { data: merge } = await db
+  const { data: merge, error: mergeError } = await db
     .from("table_merges")
     .select("*")
     .eq("id", membership.merge_id)
     .maybeSingle()
-  const { data: members } = await db
+  if (failOnReadError && mergeError)
+    throw new Error("errors.pos.sendFailed")
+  const { data: members, error: membersError } = await db
     .from("table_merge_members")
     .select("table_id")
     .eq("merge_id", membership.merge_id)
+  if (failOnReadError && membersError)
+    throw new Error("errors.pos.sendFailed")
 ...
-  const merge = await loadMergeContext(db, String(table.id))
+  const merge = await loadMergeContext(db, String(table.id), true)
```

</details>
````

### App review 5541107863 — baseline

Title:

```
**The `now()` cutoff in the baseline weakens the check on every reset.**
```

Comment:

```
The baseline evaluates `now()` each time `supabase db reset --local` runs. A fresh database gets the reset time as its cutoff. Any seed or fixture row whose `created_at` falls before that time can have a null `reservation_id`. The legacy test in `tests/integration/pos/orders-persistence.integ.test.ts` depends on this: it inserts `created_at: "2020-01-01"` with a null reservation, and the database accepts it. The `created_at` column comes from the client and is writable by service-role callers. Any service-role insert that sends a past `created_at` therefore skips the requirement. Two fixes are possible. A fixed literal cutoff gives the same behavior on remote and local databases. A trigger that compares against the immutable insert time removes the bypass. At minimum, record that `created_at` must not be client-supplied.
```

### Cross-reference — app review `operations.ts`

Same finding as CLI leftover 3 (`Propagate unresolved merge-read errors only`). Comment not repeated.

Title:

```
A failed merge-context read can narrow the label set without any error.
```

`app/actions/operations.ts` lines 1094-1095. `cr-comment:v1:04d93df45c94ef8917d80698`.

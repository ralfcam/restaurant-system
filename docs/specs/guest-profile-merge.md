# Guest profile merge

**Status:** Draft
**Last updated:** 2026-10-06

## Scope

Staff can find and merge duplicate guest fichas. A ficha is still the set of reservations that share one normalized email, as in [guest-profiles.md](./guest-profiles.md). There is no `guests` table. This spec does not edit that file.

A candidate pair is two different non-blank normalized emails that share one normalized phone. The phone normalizes by trimming and removing spaces. Name-only matches are not candidates. Nothing merges until a staff member confirms it.

The confirmed merge keeps the email the staff member selects. Reservations on the other email have their `email` rewritten to the surviving email. Rows are not copied. Both histories then appear on the surviving ficha, newest `date` then `time` first, without a duplicated reservation id. Reservations on any other email stay unchanged. A blank email has no ficha and cannot be merged.

The action uses `requireStaffUser` and the service-role client.

Out of this spec: an automatic merge, a `guests` table, a name-only match, and merging a reservation that has no email.

## Acceptance criteria

1. **GM-1 — Staff gate.** Listing candidates and confirming a merge use `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller cannot merge. A `super_admin` session can. The control lives on the guest ficha with `data-testid="guest-merge"`.

2. **GM-2 — Candidates.** Two fichas are candidates when their normalized phones are equal and non-blank and their normalized emails differ. Emails that do not share a phone are not listed. A blank, null, or whitespace phone does not create a candidate. The list is read-only until confirm.

3. **GM-3 — No automatic merge.** Opening the ficha, reloading it, or viewing candidates writes no `email` change. A merge persists only after the staff confirm action.

4. **GM-4 — Surviving email.** The confirm action takes the surviving email and the other email. Every reservation whose normalized email is the other email is updated to the surviving email. No reservation id is inserted or deleted. The surviving ficha then lists the previous rows of both emails. Reservation ids are unique in that list.

5. **GM-5 — Unrelated rows.** Reservations whose normalized email is neither email in the pair are unchanged. A reservation with a null or blank email is unchanged.

6. **GM-6 — Refused pair.** Confirming two emails that are not candidates, confirming an email with itself, or confirming a blank email writes nothing.

## Implementation trace (non-normative)

FIX `res-84_guest_profile_merge_a475` (RES-84, 2026-10-06). GM-1–GM-6 shipped. `normalizeGuestPhone` trims and removes spaces. `mergeCandidateEmails` returns the sorted other emails that share a non-blank normalized phone with the subject. `listGuestMergeCandidates` and `confirmGuestMerge` call `requireStaffUser` then `createServiceClient`. Confirm updates `reservations.email` to the surviving normalized email with `.eq("email_normalized", other)` only when that other email is a candidate. `GuestProfilePanel` renders `data-testid="guest-merge"` and submits `confirmGuestMerge` for either survivor. `/admin/customers/[email]` passes `mergeCandidates`. Tests: `tests/unit/guest-profiles/merge.test.ts`.

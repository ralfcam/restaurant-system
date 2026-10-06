# Guest segmentation

**Status:** Draft
**Last updated:** 2026-10-06

## Scope

Staff can filter the guest list at `/admin/customers`. A guest is one non-blank normalized email, the same identity as [guest-profiles.md](./guest-profiles.md). Blank emails are not listed. The list is read with `requireStaffUser` and the service-role client. Applying or clearing filters does not update reservations or settings.

Filters combine with AND. Each filter is optional. The supported filters are a case-insensitive name substring, a phone substring, a minimum count of `completed` reservations, whether the guest has a `no_show` reservation, and a last `completed` visit on or before a date. The displayed name and phone are those of the newest reservation in the group. Clearing every filter shows every non-blank normalized email. The list links to the existing ficha.

Out of this spec: saved segments, a marketing campaign, a fixed VIP or loyalty rule, and listing reservations that have no email.

## Acceptance criteria

1. **GS-1 — Staff list.** `GET /admin/customers` uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller receives neither the list nor the filters. A `super_admin` session can open it. The filter form has `data-testid="guest-segment-filters"`.

2. **GS-2 — One row per email.** Each row is one normalized email that has at least one reservation. The name and phone shown are from the newest reservation by `date` then `time`. A null, blank, or whitespace email produces no row. A row links to `/admin/customers/[email]` for that key.

3. **GS-3 — Combined filters.** Setting more than one filter returns only guests that match every set filter. Name match is trim and case-insensitive substring. Phone match is a substring of the stored phone. Minimum visits counts reservations with `status = 'completed'`. The no-show filter keeps guests who have at least one `no_show` reservation. The last-visit filter keeps guests whose newest `completed` date is on or before the given date. A guest who fails one set filter is absent.

4. **GS-4 — Results follow the filters.** Changing a filter changes the returned rows to the new match. A filter that matches nobody returns an empty list and does not error.

5. **GS-5 — Read only.** Applying filters, clearing them, and loading the list leave every reservation column unchanged.

6. **GS-6 — Clear.** Clearing all filters returns every guest row from GS-2, including guests hidden by the previous filter.

## Implementation trace (non-normative)

FIX `res-86_guest_segmentation_88f7` (RES-86, 2026-10-06). GS-1–GS-6 shipped. `segmentGuests` in `lib/guest-profiles.ts` groups by `normalizeGuestEmail` (null, blank, or whitespace emails are dropped) and keeps the newest row by `date` then `time`: `(row.date ?? "").localeCompare(current.date ?? "")`, then the same on `time`, and an equal date and time keeps the stored row. It counts `status === "completed"` and sets `hasNoShow` when `status === "no_show"`. Optional filters AND: a trimmed name is a case-insensitive substring of the newest `guest_name` (empty after trim is unset); a trimmed phone is a substring of the newest `phone`; `minCompleted` drops a group whose completed count is lower; `hasNoShow` applies only when the flag is `true`; `lastVisitOnOrBefore` drops a group with no completed row, or whose newest completed `date` (`?? ""`) is greater than the cutoff, so a missing date on a completed row is not after the cutoff. Results sort by email. `parseGuestSegmentFilters` reads the first string (or the first string in an array): name and phone trim-to-empty means unset; `minCompleted` only when `/^\d+$/`; `hasNoShow` only for `"true"`, `"on"`, or `"1"`; `lastVisitOnOrBefore` only when `/^\d{4}-\d{2}-\d{2}$/`. `listGuestSegments` calls `requireStaffUser` then `createServiceClient().from("reservations").select("email, guest_name, phone, status, date, time")`. No staff returns `errors.guestProfiles.unauthorized`. A select error logs `[guest-profiles] listGuestSegments:` and returns `errors.guestProfiles.unmapped`. `app/admin/customers/page.tsx` awaits `searchParams`, passes `parseGuestSegmentFilters` into `listGuestSegments`, and returns `null` when `result.error` is set. The GET form is `data-testid="guest-segment-filters"`. Each row links with `guestProfileHref`. Tests: `tests/unit/guest-profiles/segmentation.test.ts`.

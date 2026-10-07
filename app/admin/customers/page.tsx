import { getTranslations } from "next-intl/server"
import { getAuthUser } from "@/app/actions/auth"
import { listGuestSegments } from "@/app/actions/guest-profiles"
import { StaffShell } from "@/components/staff/staff-shell"
import { parseGuestSegmentFilters } from "@/lib/guest-profiles"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string | string[]
    phone?: string | string[]
    minCompleted?: string | string[]
    hasNoShow?: string | string[]
    lastVisitOnOrBefore?: string | string[]
  }>
}) {
  const params = await searchParams
  const filters = parseGuestSegmentFilters(params)
  const t = await getTranslations()
  const [result, authUser] = await Promise.all([
    listGuestSegments(filters),
    getAuthUser(),
  ])

  if (result.error) return null

  return (
    <StaffShell
      title={t("staff.customers.title")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <form
        method="get"
        data-testid="guest-segment-filters"
        className="grid max-w-sm gap-3"
      >
        <label className="grid gap-1 text-sm">
          {t("staff.customers.name")}
          <input name="name" className="rounded-md border px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          {t("staff.customers.phone")}
          <input name="phone" className="rounded-md border px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          {t("staff.customers.completedVisits")}
          <input name="minCompleted" className="rounded-md border px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="hasNoShow" type="checkbox" />
          {t("status.reservation.noShow")}
        </label>
        <label className="grid gap-1 text-sm">
          {t("staff.customers.lastVisit")}
          <input
            name="lastVisitOnOrBefore"
            type="date"
            className="rounded-md border px-3 py-2"
          />
        </label>
      </form>
      <ul className="grid max-w-sm gap-2">
        {(result.guests ?? []).map((guest) => (
          <li key={guest.email}>
            <a href={guest.href ?? ""}>
              {guest.guest_name} {guest.phone}
            </a>
          </li>
        ))}
      </ul>
    </StaffShell>
  )
}

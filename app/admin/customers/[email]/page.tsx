import { getTranslations } from "next-intl/server"
import { getAuthUser } from "@/app/actions/auth"
import * as guestProfileActions from "@/app/actions/guest-profiles"
import { GuestProfilePanel } from "@/components/staff/guest-profile-panel"
import { StaffShell } from "@/components/staff/staff-shell"
import { guestEmailFromRouteParam } from "@/lib/guest-profiles"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminGuestProfilePage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email: routeEmail } = await params
  const email = guestEmailFromRouteParam(routeEmail) ?? ""
  const t = await getTranslations()
  const listGuestMergeCandidates =
    "listGuestMergeCandidates" in guestProfileActions
      ? guestProfileActions.listGuestMergeCandidates
      : null
  const [loaded, authUser, candidates] = await Promise.all([
    guestProfileActions.getGuestProfile(email),
    getAuthUser(),
    listGuestMergeCandidates
      ? listGuestMergeCandidates(email)
      : Promise.resolve({ candidates: [] as string[] }),
  ])
  const profile = { ...loaded, email: loaded.email ?? "" }

  return (
    <StaffShell
      title={t("staff.customers.title")}
      description={profile.email}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <div className="grid max-w-sm gap-3">
        <GuestProfilePanel
          showEmail={false}
          mergeCandidates={candidates.candidates ?? []}
          profile={{
            email: profile.email,
            guest_name: profile.guest_name,
            phone: profile.phone,
            notes: profile.notes,
            summary: profile.summary,
            history: profile.history,
            incidents: profile.incidents,
          }}
        />
      </div>
    </StaffShell>
  )
}

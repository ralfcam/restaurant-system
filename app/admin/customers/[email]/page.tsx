import { StaffShell } from "@/components/staff/staff-shell"
import { getGuestProfile } from "@/app/actions/guest-profiles"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminGuestProfilePage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const [profile, authUser] = await Promise.all([
    getGuestProfile(email),
    getAuthUser(),
  ])

  return (
    <StaffShell
      title="Customer"
      description={email}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <p className="text-sm text-muted-foreground">{profile.error ?? email}</p>
    </StaffShell>
  )
}

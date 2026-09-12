import { StaffShell } from "@/components/staff/staff-shell"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminAnalyticsPage() {
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title="Analytics"
      description="Reservation outcomes, visit duration, and booking patterns"
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <p className="text-sm text-muted-foreground">Analytics</p>
    </StaffShell>
  )
}

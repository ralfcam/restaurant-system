import { StaffShell } from "@/components/staff/staff-shell"
import { InquiriesManager } from "@/components/staff/inquiries-manager"
import { getEventInquiries } from "@/app/actions/inquiries"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminInquiriesPage() {
  const [listed, authUser] = await Promise.all([
    getEventInquiries(),
    getAuthUser(),
  ])

  return (
    <StaffShell
      title="Inquiries"
      description="Group and private-event requests"
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <InquiriesManager inquiries={listed.inquiries} error={listed.error} />
    </StaffShell>
  )
}

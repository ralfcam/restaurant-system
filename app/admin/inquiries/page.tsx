import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { InquiriesManager } from "@/components/staff/inquiries-manager"
import { getEventInquiries } from "@/app/actions/inquiries"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminInquiriesPage() {
  const t = await getTranslations()
  const [listed, authUser] = await Promise.all([
    getEventInquiries(),
    getAuthUser(),
  ])

  return (
    <StaffShell
      title={t("staff.inquiries.title")}
      description={t("staff.inquiries.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <InquiriesManager inquiries={listed.inquiries} error={listed.error} />
    </StaffShell>
  )
}

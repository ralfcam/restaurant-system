import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminAnalyticsPage() {
  const t = await getTranslations()
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title={t("staff.analytics.title")}
      description={t("staff.analytics.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <p className="text-sm text-muted-foreground">
        {t("staff.analytics.body")}
      </p>
    </StaffShell>
  )
}

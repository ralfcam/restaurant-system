import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { ReviewEmailSettingsForm } from "@/app/admin/marketing/review-email-settings-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminMarketingPage() {
  const t = await getTranslations()
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title={t("staff.marketing.title")}
      description={t("staff.marketing.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <Card className="max-w-xl">
        <CardHeader className="border-b">
          <CardTitle>{t("staff.marketing.reviewEmailTitle")}</CardTitle>
          <CardDescription>
            {t("staff.marketing.reviewEmailDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewEmailSettingsForm isSuperAdmin={isSuperAdminUser(authUser)} />
        </CardContent>
      </Card>
    </StaffShell>
  )
}

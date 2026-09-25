import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { RestaurantLogoEditor } from "@/components/staff/restaurant-logo-editor"
import { RestaurantHeroImageEditor } from "@/components/staff/restaurant-hero-image-editor"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { RESTAURANT } from "@/lib/data"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const t = await getTranslations()
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title={t("staff.branding.title")}
      description={t("staff.branding.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <div className="flex flex-col gap-6">
        <Card className="max-w-xl">
          <CardHeader className="border-b">
            <CardTitle>{t("staff.branding.logoTitle")}</CardTitle>
            <CardDescription>
              {t("staff.branding.logoDescription", { name: RESTAURANT.name })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantLogoEditor isSuperAdmin={isSuperAdminUser(authUser)} />
          </CardContent>
        </Card>

        <Card className="max-w-xl">
          <CardHeader className="border-b">
            <CardTitle>{t("staff.branding.heroTitle")}</CardTitle>
            <CardDescription>
              {t("staff.branding.heroDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantHeroImageEditor
              isSuperAdmin={isSuperAdminUser(authUser)}
            />
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  )
}

import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { RestaurantLogoEditor } from "@/components/staff/restaurant-logo-editor"
import { RestaurantHeroImageEditor } from "@/components/staff/restaurant-hero-image-editor"
import { WidgetPageEditor } from "@/components/staff/widget-page-editor"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { createServiceClient } from "@/lib/supabase/service"
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
  const { data: widgetCopy } = await createServiceClient()
    .from("restaurant_settings")
    .select(
      "restaurant_display_name, tagline, welcome_title, welcome_message, closing_message, show_reservation_phone",
    )
    .eq("id", 1)
    .maybeSingle()

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

        <WidgetPageEditor
          restaurant_display_name={widgetCopy?.restaurant_display_name ?? null}
          tagline={widgetCopy?.tagline ?? null}
          welcome_title={widgetCopy?.welcome_title ?? null}
          welcome_message={widgetCopy?.welcome_message ?? null}
          closing_message={widgetCopy?.closing_message ?? null}
          show_reservation_phone={widgetCopy?.show_reservation_phone ?? false}
        />
      </div>
    </StaffShell>
  )
}

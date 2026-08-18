import { StaffShell } from "@/components/staff/staff-shell"
import { RestaurantLogoEditor } from "@/components/staff/restaurant-logo-editor"
import { getAuthUser } from "@/app/actions/auth"
import { RESTAURANT } from "@/lib/data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title="Branding"
      description="Minimal CMS — guest-facing brand content"
      user={{ email: authUser?.email }}
    >
      <Card className="max-w-xl">
        <CardHeader className="border-b">
          <CardTitle>Restaurant logo</CardTitle>
          <CardDescription>
            Replace the default brand mark for {RESTAURANT.name} on the guest
            header, staff login, and console. PNG, JPG, SVG, or WEBP, up to 2MB.
            Restoring default brings back the bundled logo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestaurantLogoEditor />
        </CardContent>
      </Card>
    </StaffShell>
  )
}

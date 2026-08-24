import { StaffShell } from "@/components/staff/staff-shell"
import { RestaurantLogoEditor } from "@/components/staff/restaurant-logo-editor"
import { RestaurantHeroImageEditor } from "@/components/staff/restaurant-hero-image-editor"
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
      <div className="flex flex-col gap-6">
        <Card className="max-w-xl">
          <CardHeader className="border-b">
            <CardTitle>Restaurant logo</CardTitle>
            <CardDescription>
              Upload a logo for {RESTAURANT.name} on the guest header, staff
              login, and console. PNG, JPG, SVG, or WEBP, up to 2MB. The
              platform ships with no default mark — removing a logo leaves
              the name only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantLogoEditor />
          </CardContent>
        </Card>

        <Card className="max-w-xl">
          <CardHeader className="border-b">
            <CardTitle>Homepage hero image</CardTitle>
            <CardDescription>
              Upload a background photo for the homepage hero. PNG, JPG, or
              WEBP, up to 4MB. The platform ships with no default photo —
              until one is uploaded, the hero renders a blank background.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantHeroImageEditor />
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  )
}

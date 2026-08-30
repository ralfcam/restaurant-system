import { StaffShell } from "@/components/staff/staff-shell"
import { getAuthUser } from "@/app/actions/auth"
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
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title="Marketing"
      description="Post-visit thank-you and Google Maps review email"
      user={{ email: authUser?.email }}
    >
      <Card className="max-w-xl">
        <CardHeader className="border-b">
          <CardTitle>Review email</CardTitle>
          <CardDescription>
            After a visit is marked completed, send a thank-you with a Maps
            review link. Off by default until copy and a https Maps URL are
            saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewEmailSettingsForm />
        </CardContent>
      </Card>
    </StaffShell>
  )
}

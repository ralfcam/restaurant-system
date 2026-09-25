import { getGuestProfile } from "@/app/actions/guest-profiles"
import { GuestProfileDialog } from "@/components/staff/guest-profile-dialog"
import { guestEmailFromRouteParam } from "@/lib/guest-profiles"

export const dynamic = "force-dynamic"

export default async function GuestProfileModalPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email: routeEmail } = await params
  const email = guestEmailFromRouteParam(routeEmail) ?? ""
  const loaded = await getGuestProfile(email)

  return (
    <GuestProfileDialog
      profile={{
        email: loaded.email ?? "",
        guest_name: loaded.guest_name,
        phone: loaded.phone,
        notes: loaded.notes,
        summary: loaded.summary,
        history: loaded.history,
      }}
    />
  )
}

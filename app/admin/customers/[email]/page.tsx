import { StaffShell } from "@/components/staff/staff-shell"
import {
  getGuestProfile,
  updateGuestProfilePii,
} from "@/app/actions/guest-profiles"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminGuestProfilePage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const [profile, authUser] = await Promise.all([
    getGuestProfile(email),
    getAuthUser(),
  ])

  async function saveGuestPii(formData: FormData) {
    "use server"
    await updateGuestProfilePii({
      email,
      guest_name: String(formData.get("guest_name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    })
  }

  return (
    <StaffShell
      title="Customer"
      description={email}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <div className="grid max-w-sm gap-3">
        <p className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Email</span>
          <span>{profile.email}</span>
        </p>
        <p className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Notes</span>
          <span>{profile.notes}</span>
        </p>
        <form action={saveGuestPii} className="grid gap-3">
          <label htmlFor="guest_name" className="grid gap-1 text-sm">
            Name
            <input
              id="guest_name"
              name="guest_name"
              autoComplete="name"
              defaultValue={profile.guest_name ?? ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label htmlFor="phone" className="grid gap-1 text-sm">
            Phone
            <input
              id="phone"
              name="phone"
              autoComplete="tel"
              defaultValue={profile.phone ?? ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <button type="submit">Save</button>
        </form>
        {!profile.history?.length ? (
          <p>No reservations — not found.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {profile.history?.map((row, index) => (
              <li
                key={`${index}-${row.date}-${row.time}-${row.party_size}-${row.status}`}
              >
                {row.date} {row.time} {row.party_size} {row.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </StaffShell>
  )
}

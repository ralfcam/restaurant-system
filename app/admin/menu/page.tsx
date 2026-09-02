import { StaffShell } from "@/components/staff/staff-shell"
import { MenuManager } from "@/components/staff/menu-manager"
import { getAllMenuItems, getHomepageChefsPicks } from "@/app/actions/menu"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminMenuPage() {
  const [items, authUser, chefsPicks] = await Promise.all([
    getAllMenuItems(),
    getAuthUser(),
    getHomepageChefsPicks(),
  ])

  return (
    <StaffShell
      title="Menu"
      description="Add, edit, and 86 dishes — changes publish to the guest menu"
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <MenuManager
        initialItems={items}
        initialChefsPicksEnabled={chefsPicks.enabled}
      />
    </StaffShell>
  )
}

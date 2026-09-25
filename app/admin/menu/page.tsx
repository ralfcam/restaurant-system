import { getTranslations } from "next-intl/server"
import { StaffShell } from "@/components/staff/staff-shell"
import { MenuManager } from "@/components/staff/menu-manager"
import {
  getAllMenuItems,
  getDishMenuTabOptions,
  getHomepageChefsPicks,
} from "@/app/actions/menu"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"

export const dynamic = "force-dynamic"

export default async function AdminMenuPage() {
  const t = await getTranslations()
  const [items, authUser, chefsPicks, menuTabOptions] = await Promise.all([
    getAllMenuItems(),
    getAuthUser(),
    getHomepageChefsPicks(),
    getDishMenuTabOptions(),
  ])

  return (
    <StaffShell
      title={t("staff.menu.title")}
      description={t("staff.menu.description")}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
    >
      <MenuManager
        initialItems={items}
        initialChefsPicksEnabled={chefsPicks.enabled}
        menuTabOptions={menuTabOptions}
      />
    </StaffShell>
  )
}

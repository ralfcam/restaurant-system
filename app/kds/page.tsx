import Link from "next/link"
import { Receipt } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { StaffShell } from "@/components/staff/staff-shell"
import { KdsBoard } from "@/components/staff/kds-board"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function KdsPage() {
  const t = await getTranslations()
  const authUser = await getAuthUser()

  return (
    <StaffShell
      title={t("staff.kds.title")}
      description={t("staff.kds.description")}
      isSuperAdmin={isSuperAdminUser(authUser)}
      actions={
        <Button variant="outline" render={<Link href="/pos" />}>
          <Receipt className="size-4" /> {t("staff.kds.openPos")}
        </Button>
      }
    >
      <KdsBoard />
    </StaffShell>
  )
}

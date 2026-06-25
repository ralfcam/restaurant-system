import Link from "next/link"
import { Receipt } from "lucide-react"
import { StaffShell } from "@/components/staff/staff-shell"
import { KdsBoard } from "@/components/staff/kds-board"
import { Button } from "@/components/ui/button"

export default function KdsPage() {
  return (
    <StaffShell
      title="Kitchen Display"
      description="Live order tickets · updates in real time"
      actions={
        <Button variant="outline" render={<Link href="/pos" />}>
          <Receipt className="size-4" /> Open POS
        </Button>
      }
    >
      <KdsBoard />
    </StaffShell>
  )
}

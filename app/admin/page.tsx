import Link from "next/link"
import {
  CalendarClock,
  Users,
  Armchair,
  Receipt,
  ArrowRight,
} from "lucide-react"
import { RESERVATIONS, TABLES, TABLE_STATUS_META } from "@/lib/data"
import { StaffShell } from "@/components/staff/staff-shell"
import { StatCard } from "@/components/staff/stat-card"
import { ReservationStatusBadge } from "@/components/staff/reservation-status"
import { Button } from "@/components/ui/button"

export default function AdminDashboardPage() {
  const todays = RESERVATIONS.filter((r) => r.status !== "cancelled")
  const covers = todays.reduce((sum, r) => sum + r.partySize, 0)
  const seated = TABLES.filter((t) => t.status === "seated").length
  const available = TABLES.filter((t) => t.status === "available").length
  const upcoming = RESERVATIONS.filter(
    (r) => r.status === "confirmed",
  ).slice(0, 5)

  return (
    <StaffShell
      title="Dashboard"
      description="Tonight's service at a glance"
      actions={
        <Button asChild>
          <Link href="/admin/reservations">
            <CalendarClock className="size-4" /> Manage reservations
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Reservations today"
          value={todays.length}
          hint="Across all services"
          tone="primary"
        />
        <StatCard
          icon={Users}
          label="Expected covers"
          value={covers}
          hint="Total guests booked"
        />
        <StatCard
          icon={Armchair}
          label="Tables seated"
          value={`${seated}/${TABLES.length}`}
          hint={`${available} available now`}
          tone="accent"
        />
        <StatCard
          icon={Receipt}
          label="Avg. check"
          value="$68"
          hint="Last 7 days"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming reservations */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">
              Upcoming reservations
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/reservations">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-xs font-medium">
                  <span className="font-heading text-sm">{r.time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.guestName}</p>
                  <p className="text-sm text-muted-foreground">
                    Party of {r.partySize}
                    {r.tableLabel ? ` · Table ${r.tableLabel}` : " · unassigned"}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <ReservationStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </div>

        {/* Floor snapshot */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">Floor status</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/floor">
                Manage <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3 p-5">
            {(
              Object.keys(TABLE_STATUS_META) as Array<
                keyof typeof TABLE_STATUS_META
              >
            ).map((status) => {
              const count = TABLES.filter((t) => t.status === status).length
              const meta = TABLE_STATUS_META[status]
              return (
                <div
                  key={status}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className={`size-2.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </StaffShell>
  )
}

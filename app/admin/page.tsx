import Link from "next/link"
import {
  CalendarClock,
  Users,
  Armchair,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { TABLES, TABLE_STATUS_META } from "@/lib/data"
import { getReservationsByDate } from "@/app/actions/reservations"
import { getAuthUser } from "@/app/actions/auth"
import { getTodayInRestaurantTZ } from "@/lib/timezone"
import { StaffShell } from "@/components/staff/staff-shell"
import { StatCard } from "@/components/staff/stat-card"
import { ReservationStatusBadge } from "@/components/staff/reservation-status"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const [authUser, allReservations] = await Promise.all([
    getAuthUser(),
    getReservationsByDate(getTodayInRestaurantTZ()),
  ])
  const todays = allReservations.filter((r) => r.status !== "cancelled")
  const covers = todays.reduce((sum, r) => sum + r.party_size, 0)
  const seated = TABLES.filter((t) => t.status === "seated").length
  const available = TABLES.filter((t) => t.status === "available").length
  const upcoming = allReservations
    .filter((r) => r.status === "confirmed")
    .slice(0, 5)

  return (
    <StaffShell
      title="Dashboard"
      description="Tonight's service at a glance"
      user={{ email: authUser?.email }}
      actions={
        <Button render={<Link href="/admin/reservations" />}>
          <CalendarClock className="size-4" /> Manage reservations
        </Button>
      }
    >
      <section aria-label="Tonight's service" className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="Bookings tonight" value={todays.length} hint="Confirmed and seated" tone="primary" />
        <StatCard icon={Users} label="Expected covers" value={covers} hint="Guests on the books" />
        <StatCard icon={Armchair} label="Floor occupancy" value={`${seated}/${TABLES.length}`} hint={`${available} tables available`} tone="accent" />
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><CheckCircle2 className="size-5" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Service is live</p><p className="mt-1 text-sm text-muted-foreground">{seated} tables seated · {available} ready for guests</p></div>
        </div>
        <Button variant="outline" render={<Link href="/admin/floor" />}>Open floor plan <ArrowRight data-icon="inline-end" /></Button>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming reservations */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">
              Upcoming reservations
            </h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/admin/reservations" />}
            >
              View all <ArrowRight className="size-4" />
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {upcoming.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                No upcoming reservations today.
              </li>
            ) : (
              upcoming.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-xs font-medium">
                    <span className="font-heading text-sm">{r.time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.guest_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Party of {r.party_size}
                      {r.table_label ? ` · Table ${r.table_label}` : " · unassigned"}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Floor snapshot */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">Floor status</h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/admin/floor" />}
            >
              Manage <ArrowRight className="size-4" />
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

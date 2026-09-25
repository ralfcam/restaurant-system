import Link from "next/link"
import {
  CalendarClock,
  Users,
  Armchair,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { createTranslator } from "next-intl"
import { getTranslations } from "next-intl/server"
import fr from "@/messages/fr.json"
import { TABLE_STATUS_META } from "@/lib/data"
import { getAvailableSlots, getFloorSnapshot } from "@/app/actions/reservations"
import { getConfiguredOperatingWindows } from "@/app/actions/availability"
import { getAuthUser } from "@/app/actions/auth"
import { isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { getTodayInRestaurantTZ } from "@/lib/timezone"
import { countFloorOccupancy } from "@/lib/floor/table-use"
import { buildWeeklyServiceOverview } from "@/lib/floor/weekly-service-overview"
import { StaffShell } from "@/components/staff/staff-shell"
import { StatCard } from "@/components/staff/stat-card"
import {
  ReservationStatusBadge,
  TableStatusLabel,
} from "@/components/staff/reservation-status"
import { WeeklyServiceOverview } from "@/components/staff/weekly-service-overview"
import { Button } from "@/components/ui/button"

void getTranslations

export const dynamic = "force-dynamic"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type DashboardCopy = {
  title: string
  description: string
  manageReservations: string
  tonightService: string
  bookingsTonight: string
  confirmedAndSeated: string
  expectedCovers: string
  guestsOnTheBooks: string
  floorOccupancy: string
  tablesAvailable: (count: number) => string
  serviceLive: string
  serviceLiveDetail: (seated: number, available: number) => string
  openFloorPlan: string
  upcomingReservations: string
  viewAll: string
  noUpcoming: string
  floorStatus: string
  manage: string
  unassigned: string
  partyOf: (count: number) => string
  tableAssigned: (label: string) => string
}

async function loadDashboardCopy(): Promise<DashboardCopy> {
  const t = createTranslator({
    locale: "fr",
    messages: fr,
    namespace: "staff.dashboard",
  })
  return {
    title: t("title"),
    description: t("description"),
    manageReservations: t("manageReservations"),
    tonightService: t("tonightService"),
    bookingsTonight: t("bookingsTonight"),
    confirmedAndSeated: t("confirmedAndSeated"),
    expectedCovers: t("expectedCovers"),
    guestsOnTheBooks: t("guestsOnTheBooks"),
    floorOccupancy: t("floorOccupancy"),
    tablesAvailable: (count) => t("tablesAvailable", { count }),
    serviceLive: t("serviceLive"),
    serviceLiveDetail: (seated, available) =>
      t("serviceLiveDetail", { seated, available }),
    openFloorPlan: t("openFloorPlan"),
    upcomingReservations: t("upcomingReservations"),
    viewAll: t("viewAll"),
    noUpcoming: t("noUpcoming"),
    floorStatus: t("floorStatus"),
    manage: t("manage"),
    unassigned: t("unassigned"),
    partyOf: (count) => t("partyOf", { count }),
    tableAssigned: (label) => t("tableAssigned", { label }),
  }
}

async function loadWeeklyServiceOverview(
  selectedDate: string,
): Promise<ReturnType<typeof buildWeeklyServiceOverview>> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { days: [] }

  const operatingDays = await getConfiguredOperatingWindows()
  const weekDates = buildWeeklyServiceOverview({
    selectedDate,
    operatingDays,
  }).days.map((day) => day.date)
  const slotsByDate = Object.fromEntries(
    await Promise.all(
      weekDates.map(async (date) => [date, await getAvailableSlots(date, 1)]),
    ),
  )
  return buildWeeklyServiceOverview({
    selectedDate,
    operatingDays,
    slotsByDate,
  })
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const today = getTodayInRestaurantTZ()
  const { week: weekParam } = await searchParams
  const selectedDate = weekParam && DATE_RE.test(weekParam) ? weekParam : today
  const [authUser, snapshot, weeklyOverview] = await Promise.all([
    getAuthUser(),
    getFloorSnapshot(today),
    loadWeeklyServiceOverview(selectedDate).catch(() => ({ days: [] })),
  ])
  const reservations = snapshot.reservations
  const todays = reservations.filter((r) => r.status !== "cancelled")
  const covers = todays.reduce((sum, r) => sum + r.party_size, 0)
  const { seated, total, available, byStatus } = countFloorOccupancy(
    snapshot.tables,
  )
  const upcoming = reservations
    .filter((r) => r.status === "confirmed")
    .slice(0, 5)
  const copy = await loadDashboardCopy()

  return (
    <StaffShell
      title={copy.title}
      description={copy.description}
      user={{ email: authUser?.email }}
      isSuperAdmin={isSuperAdminUser(authUser)}
      actions={
        <Button render={<Link href="/admin/reservations" />}>
          <CalendarClock className="size-4" /> {copy.manageReservations}
        </Button>
      }
    >
      <section
        aria-label={copy.tonightService}
        className="grid gap-4 sm:grid-cols-3"
      >
        <StatCard
          icon={CalendarClock}
          label={copy.bookingsTonight}
          value={todays.length}
          hint={copy.confirmedAndSeated}
          tone="primary"
        />
        <StatCard
          icon={Users}
          label={copy.expectedCovers}
          value={covers}
          hint={copy.guestsOnTheBooks}
        />
        {/* Floor occupancy */}
        <StatCard
          icon={Armchair}
          label={copy.floorOccupancy}
          value={`${seated}/${total}`}
          hint={copy.tablesAvailable(available)}
          tone="accent"
        />
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            {/* Service is live */}
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {copy.serviceLive}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.serviceLiveDetail(seated, available)}
            </p>
          </div>
        </div>
        <Button variant="outline" render={<Link href="/admin/floor" />}>
          {copy.openFloorPlan} <ArrowRight data-icon="inline-end" />
        </Button>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming reservations */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">
              {copy.upcomingReservations}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/admin/reservations" />}
            >
              {copy.viewAll} <ArrowRight className="size-4" />
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {upcoming.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                {copy.noUpcoming}
              </li>
            ) : (
              upcoming.map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-xs font-medium">
                    <span className="font-heading text-sm">{r.time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.guest_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {copy.partyOf(r.party_size)}
                      {r.table_label
                        ? copy.tableAssigned(r.table_label)
                        : copy.unassigned}
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
            {/* Floor status */}
            <h2 className="font-heading text-lg font-semibold">
              {copy.floorStatus}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/admin/floor" />}
            >
              {copy.manage} <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="space-y-3 p-5">
            {(
              Object.keys(TABLE_STATUS_META) as Array<
                keyof typeof TABLE_STATUS_META
              >
            ).map((status) => {
              const count = byStatus[status]
              const meta = TABLE_STATUS_META[status]
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <span className={`size-2.5 rounded-full ${meta.dot}`} />
                    <TableStatusLabel status={status} />
                  </span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <WeeklyServiceOverview
        selectedDate={selectedDate}
        days={weeklyOverview.days}
      />
    </StaffShell>
  )
}

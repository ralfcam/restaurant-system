import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import {
  shiftSelectedWeek,
  type WeeklyOverviewDay,
} from "@/lib/floor/weekly-service-overview"
import { cn } from "@/lib/utils"

export async function WeeklyServiceOverview({
  selectedDate,
  days,
}: {
  selectedDate: string
  days: WeeklyOverviewDay[]
}) {
  const t = await getTranslations("staff.dashboard")
  const tStatus = await getTranslations()
  const weeklyOverview = t("weeklyOverview")
  const previousWeek = t("previousWeek")
  const nextWeekLabel = t("nextWeek")
  const prevWeek = shiftSelectedWeek(selectedDate, -1)
  const nextWeek = shiftSelectedWeek(selectedDate, 1)

  return (
    <section
      aria-label={weeklyOverview}
      data-testid="week-overview"
      className="mt-6 rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-heading text-lg font-semibold">{weeklyOverview}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid="prev-week"
            render={<Link href={`/admin?week=${prevWeek}`} />}
          >
            <ChevronLeft data-icon="inline-start" />
            {previousWeek}
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="next-week"
            render={<Link href={`/admin?week=${nextWeek}`} />}
          >
            {nextWeekLabel}
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-7">
        {days.map((day) => (
          <div key={day.date}>
            <p className="text-sm font-medium">{day.date}</p>
            <ul className="mt-2 space-y-2">
              {day.services.map((service, index) => {
                const available = service.status === "available"
                const weeklyStatus = {
                  available: "status.weekly.available",
                  fully_booked: "status.weekly.fullyBooked",
                } as const
                return (
                  <li key={`${day.date}:${index}:${service.label}`}>
                    <p className="text-sm">{service.label}</p>
                    <p
                      className={cn(
                        "text-sm",
                        available ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {tStatus(
                        available
                          ? weeklyStatus.available
                          : weeklyStatus.fully_booked,
                      )}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  shiftSelectedWeek,
  type WeeklyOverviewDay,
} from "@/lib/floor/weekly-service-overview"
import { cn } from "@/lib/utils"

export function WeeklyServiceOverview({
  selectedDate,
  days,
}: {
  selectedDate: string
  days: WeeklyOverviewDay[]
}) {
  const prevWeek = shiftSelectedWeek(selectedDate, -1)
  const nextWeek = shiftSelectedWeek(selectedDate, 1)

  return (
    <section
      aria-label="Weekly service overview"
      data-testid="week-overview"
      className="mt-6 rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-heading text-lg font-semibold">
          Weekly service overview
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid="prev-week"
            render={<Link href={`/admin?week=${prevWeek}`} />}
          >
            <ChevronLeft data-icon="inline-start" />
            Previous week
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="next-week"
            render={<Link href={`/admin?week=${nextWeek}`} />}
          >
            Next week
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
                return (
                  <li key={`${day.date}:${index}:${service.label}`}>
                    <p className="text-sm">{service.label}</p>
                    <p
                      className={cn(
                        "text-sm",
                        available ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {available ? "available" : "fully booked"}
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

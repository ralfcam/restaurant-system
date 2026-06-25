import { cn } from "@/lib/utils"
import { CountUp } from "@/components/staff/count-up"

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  tone?: "default" | "primary" | "accent"
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-foreground/5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-110",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "accent" && "bg-accent/10 text-accent",
            tone === "default" && "bg-secondary text-secondary-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
        <CountUp value={value} />
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

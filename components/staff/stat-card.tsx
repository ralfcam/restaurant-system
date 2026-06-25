import { cn } from "@/lib/utils"

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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-md",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "accent" && "bg-accent/10 text-accent",
            tone === "default" && "bg-secondary text-secondary-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

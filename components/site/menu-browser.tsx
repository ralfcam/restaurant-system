"use client"

import { useState } from "react"
import Image from "next/image"
import { Leaf, AlertCircle } from "lucide-react"
import {
  MENU_CATEGORIES,
  MENU_ITEMS,
  type MenuCategory,
  type Allergen,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  dairy: "Dairy",
  nuts: "Nuts",
  shellfish: "Shellfish",
  egg: "Egg",
  vegan: "Vegan",
}

type Filter = "All" | MenuCategory

export function MenuBrowser() {
  const [filter, setFilter] = useState<Filter>("All")

  const items =
    filter === "All"
      ? MENU_ITEMS
      : MENU_ITEMS.filter((m) => m.category === filter)

  const tabs: Filter[] = ["All", ...MENU_CATEGORIES]

  return (
    <div>
      {/* Sticky category filter */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:border">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                filter === tab
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex gap-4 overflow-hidden rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-md sm:p-4"
          >
            {item.image ? (
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg sm:size-28">
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
                  {item.name}
                  {item.popular ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Popular
                    </span>
                  ) : null}
                </h3>
                <span className="shrink-0 font-medium tabular-nums text-primary">
                  ${item.price}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              {item.allergens.length > 0 ? (
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                  {item.allergens.map((a) => (
                    <Badge
                      key={a}
                      variant="secondary"
                      className="gap-1 font-normal text-muted-foreground"
                    >
                      {a === "vegan" ? (
                        <Leaf className="size-3 text-accent" />
                      ) : (
                        <AlertCircle className="size-3" />
                      )}
                      {ALLERGEN_LABEL[a]}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

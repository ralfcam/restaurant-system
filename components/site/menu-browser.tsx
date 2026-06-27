"use client"

import { useMemo, useState } from "react"
import { Globe, UtensilsCrossed } from "lucide-react"
import { MENUS, type MenuId } from "@/lib/data"
import type { MenuItemRow } from "@/app/actions/menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Locale = "fr" | "en"

function groupBySection(items: MenuItemRow[], locale: Locale) {
  const groups: { key: string; title: string; items: MenuItemRow[] }[] = []
  const seen = new Map<string, number>()

  for (const item of items) {
    const title = locale === "fr" ? item.section : item.section_en
    const existing = seen.get(title)
    if (existing !== undefined) {
      groups[existing].items.push(item)
    } else {
      seen.set(title, groups.length)
      groups.push({ key: title, title, items: [item] })
    }
  }

  return groups
}

export function MenuBrowser({
  initialItems = [],
}: {
  initialItems?: MenuItemRow[]
}) {
  const [locale, setLocale] = useState<Locale>("fr")
  const [menuId, setMenuId] = useState<MenuId>(MENUS[0]?.id ?? "soir")

  const menuMeta = MENUS.find((m) => m.id === menuId)
  const menuItems = useMemo(
    () => initialItems.filter((item) => item.menu_id === menuId),
    [initialItems, menuId],
  )
  const sections = useMemo(
    () => groupBySection(menuItems, locale),
    [menuItems, locale],
  )

  const populatedMenus = MENUS.filter((menu) =>
    initialItems.some((item) => item.menu_id === menu.id),
  )
  const tabs = populatedMenus.length > 0 ? populatedMenus : MENUS

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 space-y-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:border">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {locale === "fr" ? "Carte bilingue" : "Bilingual menu"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLocale((l) => (l === "fr" ? "en" : "fr"))}
          >
            <Globe className="size-4" />
            {locale === "fr" ? "EN" : "FR"}
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMenuId(tab.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                menuId === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {locale === "fr" ? tab.title : tab.titleEn}
            </button>
          ))}
        </div>
      </div>

      {initialItems.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <UtensilsCrossed className="size-8" />
          <p className="font-medium">
            {locale === "fr" ? "Carte bientôt disponible" : "Menu coming soon"}
          </p>
          <p className="text-sm">
            {locale === "fr"
              ? "Revenez dans un instant — nous mettons la carte à jour."
              : "Check back shortly — we're updating our dishes."}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-8">
        {menuItems.length === 0 && initialItems.length > 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {locale === "fr"
              ? "Aucun plat disponible dans cette carte pour le moment."
              : "No dishes available in this menu right now."}
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-4 font-heading text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.items.map((item) => {
                  const name = locale === "fr" ? item.name : item.name_en
                  const description =
                    locale === "fr" ? item.description : item.description_en

                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md sm:p-5"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
                          {name}
                          {item.popular ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {locale === "fr" ? "Signature" : "Signature"}
                            </span>
                          ) : null}
                        </h3>
                        <span className="shrink-0 font-medium tabular-nums text-primary">
                          {item.price}
                        </span>
                      </div>
                      {description ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {description}
                        </p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {menuMeta && menuItems.length > 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {locale === "fr" ? menuMeta.footerNote : menuMeta.footerNoteEn}
        </p>
      ) : null}
    </div>
  )
}

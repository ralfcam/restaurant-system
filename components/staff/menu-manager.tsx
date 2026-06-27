"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, Search, Star, UtensilsCrossed, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { MENUS, type MenuId } from "@/lib/data"
import { parsePriceValue } from "@/lib/akta-menu"
import {
  type MenuItemRow,
  upsertMenuItem,
  createMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "@/app/actions/menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Filter = "All" | MenuId

type Draft = {
  id?: string
  slug?: string
  name: string
  name_en: string
  description: string
  description_en: string
  price: string
  menu_id: MenuId
  section: string
  section_en: string
  popular: boolean
  available: boolean
  sort_order: number
}

function emptyDraft(): Draft {
  const firstMenu = MENUS[0]
  const firstSection = firstMenu?.sections[0]
  return {
    name: "",
    name_en: "",
    description: "",
    description_en: "",
    price: "",
    menu_id: firstMenu?.id ?? "soir",
    section: firstSection?.title ?? "",
    section_en: firstSection?.titleEn ?? "",
    popular: false,
    available: true,
    sort_order: 0,
  }
}

function toDraft(item: MenuItemRow): Draft {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    name_en: item.name_en,
    description: item.description,
    description_en: item.description_en,
    price: item.price,
    menu_id: item.menu_id,
    section: item.section,
    section_en: item.section_en,
    popular: item.popular,
    available: item.available,
    sort_order: item.sort_order,
  }
}

function menuLabel(menuId: MenuId) {
  return MENUS.find((m) => m.id === menuId)?.title ?? menuId
}

export function MenuManager({
  initialItems = [],
}: {
  initialItems?: MenuItemRow[]
}) {
  const [items, setItems] = useState<MenuItemRow[]>(initialItems)
  const [filter, setFilter] = useState<Filter>("All")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())

  const filtered = useMemo(() => {
    return items.filter((m) => {
      const matchMenu = filter === "All" || m.menu_id === filter
      const q = query.trim().toLowerCase()
      const matchQuery =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        m.name_en.toLowerCase().includes(q)
      return matchMenu && matchQuery
    })
  }, [items, filter, query])

  const availableCount = items.filter((m) => m.available).length
  const sectionOptions = useMemo(() => {
    const menu = MENUS.find((m) => m.id === draft.menu_id)
    return menu?.sections ?? []
  }, [draft.menu_id])

  function openCreate() {
    setDraft(emptyDraft())
    setOpen(true)
  }

  function openEdit(item: MenuItemRow) {
    setDraft(toDraft(item))
    setOpen(true)
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("French name is required")
      return
    }
    if (!draft.name_en.trim()) {
      toast.error("English name is required")
      return
    }
    if (!draft.price.trim()) {
      toast.error("Enter a price label")
      return
    }
    if (!draft.section.trim() || !draft.section_en.trim()) {
      toast.error("Section labels are required")
      return
    }

    setSaving(true)
    const priceValue = parsePriceValue(draft.price)
    const base = {
      name: draft.name.trim(),
      name_en: draft.name_en.trim(),
      description: draft.description.trim(),
      description_en: draft.description_en.trim(),
      price: draft.price.trim(),
      price_value: priceValue,
      menu_id: draft.menu_id,
      section: draft.section.trim(),
      section_en: draft.section_en.trim(),
      popular: draft.popular,
      available: draft.available,
      sort_order: draft.sort_order,
    }

    if (draft.id && draft.slug) {
      const { row, error } = await upsertMenuItem({
        ...base,
        id: draft.id,
        slug: draft.slug,
      })
      if (error) {
        toast.error("Could not save", { description: error })
        setSaving(false)
        return
      }
      setItems((prev) =>
        prev.map((i) => (i.id === draft.id ? (row ?? { ...i, ...base }) : i)),
      )
      toast.success(`Updated ${base.name}`)
    } else {
      const { row, error } = await createMenuItem(base)
      if (error) {
        toast.error("Could not create dish", { description: error })
        setSaving(false)
        return
      }
      if (row) {
        setItems((prev) => [row, ...prev])
      }
      toast.success(`Added ${base.name}`)
    }
    setSaving(false)
    setOpen(false)
  }

  async function remove(item: MenuItemRow) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    const { error } = await deleteMenuItem(item.id)
    if (error) {
      toast.error("Could not delete", { description: error })
      setItems((prev) => [...prev, item])
      return
    }
    toast.success(`Removed ${item.name}`)
  }

  async function handleToggle(item: MenuItemRow) {
    const next = !item.available
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, available: next } : i)),
    )
    const { error } = await toggleMenuItemAvailability(item.id, next)
    if (error) {
      toast.error("Could not update availability", { description: error })
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, available: item.available } : i,
        ),
      )
    }
  }

  const tabs: Filter[] = ["All", ...MENUS.map((m) => m.id)]

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t === "All" ? "All menus" : menuLabel(t)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes"
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="size-4" /> New item
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {filtered.length === 0 ? (
            <li className="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-muted-foreground">
              <UtensilsCrossed className="size-6" />
              No dishes match your filters.
            </li>
          ) : (
            filtered.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 transition-opacity",
                  !item.available && "opacity-60",
                )}
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <UtensilsCrossed className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{item.name}</p>
                    {item.popular ? (
                      <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                    ) : null}
                    {!item.available ? (
                      <Badge variant="secondary" className="shrink-0 text-destructive">
                        86&apos;d
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {menuLabel(item.menu_id)} · {item.section} · {item.price}
                  </p>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <Switch
                    checked={item.available}
                    onCheckedChange={() => handleToggle(item)}
                    aria-label={`Toggle availability for ${item.name}`}
                  />
                  <span className="w-16 text-xs text-muted-foreground">
                    {item.available ? "Available" : "Unavailable"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    title="Edit"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit {item.name}</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={() => remove(item)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete {item.name}</span>
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {availableCount} of {items.length} dishes live on the guest menu
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit dish" : "New dish"}</DialogTitle>
            <DialogDescription>
              Changes publish to the guest menu after the next page load.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-0.5 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name (FR)</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Entrecôte de bœuf 350g"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="name_en">Name (EN)</Label>
              <Input
                id="name_en"
                value={draft.name_en}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name_en: e.target.value }))
                }
                placeholder="e.g. Beef ribeye steak 350g"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Description (FR)</Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="Short, appetizing description"
                rows={2}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description_en">Description (EN)</Label>
              <Textarea
                id="description_en"
                value={draft.description_en}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description_en: e.target.value }))
                }
                placeholder="English description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="price">Price (CHF label)</Label>
                <Input
                  id="price"
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                  placeholder="50.-"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input
                  id="sort_order"
                  inputMode="numeric"
                  value={String(draft.sort_order)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      sort_order: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Menu</Label>
              <Select
                value={draft.menu_id}
                onValueChange={(v) => {
                  const menuId = (v as MenuId) ?? draft.menu_id
                  const menu = MENUS.find((m) => m.id === menuId)
                  const section = menu?.sections[0]
                  setDraft((d) => ({
                    ...d,
                    menu_id: menuId,
                    section: section?.title ?? d.section,
                    section_en: section?.titleEn ?? d.section_en,
                  }))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MENUS.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Section (FR)</Label>
                <Select
                  value={draft.section}
                  onValueChange={(v) => {
                    const section = sectionOptions.find((s) => s.title === v)
                    setDraft((d) => ({
                      ...d,
                      section: v ?? d.section,
                      section_en: section?.titleEn ?? d.section_en,
                    }))
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionOptions.map((section) => (
                      <SelectItem key={section.title} value={section.title}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="section_en">Section (EN)</Label>
                <Input
                  id="section_en"
                  value={draft.section_en}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, section_en: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Mark as popular</p>
                <p className="text-xs text-muted-foreground">
                  Shows a highlight badge on the menu.
                </p>
              </div>
              <Switch
                checked={draft.popular}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, popular: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-xs text-muted-foreground">
                  Turn off to 86 the dish and hide it from guests.
                </p>
              </div>
              <Switch
                checked={draft.available}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, available: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : draft.id ? (
                "Save changes"
              ) : (
                "Add to menu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

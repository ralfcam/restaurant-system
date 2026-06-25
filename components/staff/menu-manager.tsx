"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Search, Star, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import {
  MENU_CATEGORIES,
  type MenuCategory,
  type Allergen,
} from "@/lib/data"
import {
  useMenu,
  createItem,
  upsertItem,
  deleteItem,
  toggleAvailability,
  type MenuItem,
} from "@/lib/menu-store"
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

const ALL_ALLERGENS: Allergen[] = [
  "gluten",
  "dairy",
  "nuts",
  "shellfish",
  "egg",
  "vegan",
]

const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  dairy: "Dairy",
  nuts: "Nuts",
  shellfish: "Shellfish",
  egg: "Egg",
  vegan: "Vegan",
}

type Filter = "All" | MenuCategory

type Draft = {
  id?: string
  name: string
  description: string
  price: string
  category: MenuCategory
  allergens: Allergen[]
  image: string
  popular: boolean
  available: boolean
}

function emptyDraft(): Draft {
  return {
    name: "",
    description: "",
    price: "",
    category: "Antipasti",
    allergens: [],
    image: "",
    popular: false,
    available: true,
  }
}

function toDraft(item: MenuItem): Draft {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: String(item.price),
    category: item.category,
    allergens: item.allergens,
    image: item.image ?? "",
    popular: item.popular ?? false,
    available: item.available ?? true,
  }
}

export function MenuManager() {
  const menu = useMenu()
  const [filter, setFilter] = useState<Filter>("All")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())

  const filtered = useMemo(() => {
    return menu.filter((m) => {
      const matchCat = filter === "All" || m.category === filter
      const matchQuery =
        query.trim() === "" ||
        m.name.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQuery
    })
  }, [menu, filter, query])

  const availableCount = menu.filter((m) => m.available ?? true).length

  function openCreate() {
    setDraft(emptyDraft())
    setOpen(true)
  }

  function openEdit(item: MenuItem) {
    setDraft(toDraft(item))
    setOpen(true)
  }

  function save() {
    const price = Number.parseFloat(draft.price)
    if (!draft.name.trim()) {
      toast.error("Name is required")
      return
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a valid price")
      return
    }
    const base = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price,
      category: draft.category,
      allergens: draft.allergens,
      image: draft.image.trim() || undefined,
      popular: draft.popular,
      available: draft.available,
    }
    if (draft.id) {
      upsertItem({ ...base, id: draft.id })
      toast.success(`Updated ${base.name}`)
    } else {
      createItem(base)
      toast.success(`Added ${base.name}`)
    }
    setOpen(false)
  }

  function remove(item: MenuItem) {
    deleteItem(item.id)
    toast.success(`Removed ${item.name}`)
  }

  function toggleAllergen(a: Allergen) {
    setDraft((d) => ({
      ...d,
      allergens: d.allergens.includes(a)
        ? d.allergens.filter((x) => x !== a)
        : [...d.allergens, a],
    }))
  }

  const tabs: Filter[] = ["All", ...MENU_CATEGORIES]

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t}
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

      {/* Item list */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {filtered.length === 0 ? (
            <li className="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-muted-foreground">
              <UtensilsCrossed className="size-6" />
              No dishes match your filters.
            </li>
          ) : (
            filtered.map((item) => {
              const isAvailable = item.available ?? true
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-opacity",
                    !isAvailable && "opacity-60",
                  )}
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {item.image ? (
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-muted-foreground">
                        <UtensilsCrossed className="size-5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{item.name}</p>
                      {item.popular ? (
                        <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                      ) : null}
                      {!isAvailable ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-destructive"
                        >
                          86&apos;d
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.category} · ${item.price}
                    </p>
                  </div>

                  {/* Availability toggle */}
                  <div className="hidden items-center gap-2 sm:flex">
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={() => toggleAvailability(item.id)}
                      aria-label={`Toggle availability for ${item.name}`}
                    />
                    <span className="w-16 text-xs text-muted-foreground">
                      {isAvailable ? "Available" : "Unavailable"}
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
              )
            })
          )}
        </ul>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {availableCount} of {menu.length} dishes live on the guest menu
      </p>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? "Edit dish" : "New dish"}
            </DialogTitle>
            <DialogDescription>
              Changes publish to the guest menu instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-0.5 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Margherita Pizza"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      category: (v as MenuCategory) ?? d.category,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="image">Image path</Label>
              <Input
                id="image"
                value={draft.image}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, image: e.target.value }))
                }
                placeholder="/images/menu/your-dish.png"
              />
            </div>

            <div className="grid gap-2">
              <Label>Allergens & tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ALLERGENS.map((a) => {
                  const active = draft.allergens.includes(a)
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {ALLERGEN_LABEL[a]}
                    </button>
                  )
                })}
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
                onCheckedChange={(v) =>
                  setDraft((d) => ({ ...d, popular: v }))
                }
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
                onCheckedChange={(v) =>
                  setDraft((d) => ({ ...d, available: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              {draft.id ? "Save changes" : "Add to menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import aktaMenuRaw from "./akta-menu.json"

export type MenuId = "midi" | "soir" | "boissons" | "blanc" | "rouge"

export interface MenuItem {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  /** Raw CHF price label, e.g. "14.- | 25.-" */
  price: string
  /** First parsed number for POS math; null when unparseable */
  priceValue: number | null
  menuId: MenuId
  section: string
  sectionEn: string
  popular?: boolean
  available?: boolean
  sort_order: number
}

export interface MenuMeta {
  id: MenuId
  title: string
  titleEn: string
  footerNote: string
  footerNoteEn: string
  sections: { title: string; titleEn: string }[]
}

type RawMenuItem = {
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  price: string
}

type RawSection = {
  title: string
  titleEn: string
  items: RawMenuItem[]
}

type RawMenu = {
  id: string
  title: string
  titleEn: string
  footerNote: string
  footerNoteEn: string
  sections: RawSection[]
}

const POPULAR_PATTERNS = [
  /c[oô]te de b[oœ]uf matur/i,
  /entrec[oô]te de b[oœ]uf 350g/i,
  /espresso martini/i,
  /os [àa] moelle/i,
  /porc, patate douce/i,
  /pinot noir, domaine de la mermi/i,
]

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

export function parsePriceValue(price: string): number | null {
  const match = price.match(/(\d+(?:\.\d+)?)(?:\.-|\b)/)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : null
}

function isPopular(name: string): boolean {
  return POPULAR_PATTERNS.some((pattern) => pattern.test(name))
}

function buildFromRaw(rawMenus: RawMenu[]): {
  menus: MenuMeta[]
  items: MenuItem[]
} {
  const usedIds = new Set<string>()
  const items: MenuItem[] = []

  const menus: MenuMeta[] = rawMenus.map((menu) => {
    const menuId = menu.id as MenuId

    menu.sections.forEach((section, sectionIndex) => {
      section.items.forEach((item, itemIndex) => {
        const baseId = `${menuId}-${slugify(section.title)}-${slugify(item.name)}`
        let id = baseId
        let suffix = 2
        while (usedIds.has(id)) {
          id = `${baseId}-${suffix}`
          suffix += 1
        }
        usedIds.add(id)

        items.push({
          id,
          name: item.name,
          nameEn: item.nameEn,
          description: item.description,
          descriptionEn: item.descriptionEn,
          price: item.price,
          priceValue: parsePriceValue(item.price),
          menuId,
          section: section.title,
          sectionEn: section.titleEn,
          popular: isPopular(item.name),
          available: true,
          sort_order: sectionIndex * 100 + itemIndex,
        })
      })
    })

    return {
      id: menuId,
      title: menu.title,
      titleEn: menu.titleEn,
      footerNote: menu.footerNote,
      footerNoteEn: menu.footerNoteEn,
      sections: menu.sections.map((s) => ({
        title: s.title,
        titleEn: s.titleEn,
      })),
    }
  })

  return { menus, items }
}

const built = buildFromRaw(aktaMenuRaw as RawMenu[])

export const MENUS: MenuMeta[] = built.menus
export const MENU_ITEMS: MenuItem[] = built.items

export const MENU_IDS: MenuId[] = MENUS.map((m) => m.id)

export function getMenuMeta(menuId: MenuId): MenuMeta | undefined {
  return MENUS.find((m) => m.id === menuId)
}

export function getItemsForMenu(menuId: MenuId): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.menuId === menuId)
}

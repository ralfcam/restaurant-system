"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { revalidatePath } from "next/cache"
import { MENU_ITEMS, type MenuId, type MenuItem } from "@/lib/data"

export type MenuItemRow = {
  id: string
  slug: string
  name: string
  name_en: string
  description: string
  description_en: string
  price: string
  price_value: number | null
  menu_id: MenuId
  section: string
  section_en: string
  popular: boolean
  available: boolean
  sort_order: number
  created_at: string
}

function mockMenuRows(availableOnly = false): MenuItemRow[] {
  const items = availableOnly
    ? MENU_ITEMS.filter((item) => item.available ?? true)
    : MENU_ITEMS

  return items.map((item) => menuItemToRow(item))
}

function menuItemToRow(item: MenuItem): MenuItemRow {
  return {
    id: item.id,
    slug: item.id,
    name: item.name,
    name_en: item.nameEn,
    description: item.description,
    description_en: item.descriptionEn,
    price: item.price,
    price_value: item.priceValue,
    menu_id: item.menuId,
    section: item.section,
    section_en: item.sectionEn,
    popular: item.popular ?? false,
    available: item.available ?? true,
    sort_order: item.sort_order,
    created_at: new Date(0).toISOString(),
  }
}

/** Public guest menu — only returns available items. */
export async function getMenuItems(): Promise<MenuItemRow[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("available", true)
    .order("menu_id", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[menu] getMenuItems error:", error.message)
    return mockMenuRows(true)
  }
  if (!data?.length) {
    return mockMenuRows(true)
  }
  return data as MenuItemRow[]
}

/** Staff-only: fetch all items including unavailable ones. */
export async function getAllMenuItems(): Promise<MenuItemRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("menu_id", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[menu] getAllMenuItems error:", error.message)
    return mockMenuRows(false)
  }
  if (!data?.length) {
    return mockMenuRows(false)
  }
  return data as MenuItemRow[]
}

export async function upsertMenuItem(
  item: Omit<MenuItemRow, "created_at">,
): Promise<{ row?: MenuItemRow; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .upsert(item, { onConflict: "id" })
    .select()
    .single()
  if (error) {
    console.error("[menu] upsertMenuItem error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return { row: data as MenuItemRow }
}

export async function createMenuItem(
  item: Omit<MenuItemRow, "id" | "slug" | "created_at">,
): Promise<{ row?: MenuItemRow; error?: string }> {
  const supabase = await createClient()
  const slug = `m-${Date.now()}`
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ ...item, id: slug, slug })
    .select()
    .single()
  if (error) {
    console.error("[menu] createMenuItem error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return { row: data as MenuItemRow }
}

export async function deleteMenuItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  if (error) {
    console.error("[menu] deleteMenuItem error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return {}
}

export async function toggleMenuItemAvailability(
  id: string,
  available: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("id", id)
  if (error) {
    console.error("[menu] toggleMenuItemAvailability error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return {}
}

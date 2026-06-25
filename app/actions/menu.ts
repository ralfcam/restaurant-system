"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { revalidatePath } from "next/cache"
import type { MenuCategory, Allergen } from "@/lib/data"

export type MenuItemRow = {
  id: string
  slug: string
  name: string
  description: string
  price: number
  category: MenuCategory
  allergens: Allergen[]
  image: string | null
  popular: boolean
  available: boolean
  sort_order: number
  created_at: string
}

/** Public guest menu — only returns available items. */
export async function getMenuItems(): Promise<MenuItemRow[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("available", true)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[menu] getMenuItems error:", error.message)
    return []
  }
  return data as MenuItemRow[]
}

/** Staff-only: fetch all items including unavailable ones. */
export async function getAllMenuItems(): Promise<MenuItemRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[menu] getAllMenuItems error:", error.message)
    return []
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
    .insert({ ...item, slug })
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

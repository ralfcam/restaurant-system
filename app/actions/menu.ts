"use server"

import { createClient } from "@/lib/supabase/server"
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

export async function getMenuItems(): Promise<MenuItemRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[v0] getMenuItems error:", error.message)
    return []
  }
  return data as MenuItemRow[]
}

export async function upsertMenuItem(
  item: Omit<MenuItemRow, "created_at">,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").upsert(item, {
    onConflict: "id",
  })
  if (error) {
    console.error("[v0] upsertMenuItem error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return {}
}

export async function createMenuItem(
  item: Omit<MenuItemRow, "id" | "slug" | "created_at">,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const slug = `m-${Date.now()}`
  const { error } = await supabase.from("menu_items").insert({ ...item, slug })
  if (error) {
    console.error("[v0] createMenuItem error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return {}
}

export async function deleteMenuItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  if (error) {
    console.error("[v0] deleteMenuItem error:", error.message)
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
    console.error("[v0] toggleMenuItemAvailability error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/admin/menu")
  return {}
}

"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
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

const CHEFS_PICKS_LIMIT = 5
const CHEFS_PICKS_LIMIT_ERROR =
  "You can pin up to 5 dishes as chef's picks — unpin one first."

async function wouldExceedChefsPicksLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId?: string,
): Promise<boolean> {
  let query = supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("popular", true)
    .eq("available", true)

  if (itemId) query = query.neq("id", itemId)
  const { count, error } = await query
  if (error) {
    console.error("[menu] chef picks count error:", error.message)
    return false
  }
  return (count ?? 0) >= CHEFS_PICKS_LIMIT
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

export async function getHomepageChefsPicks(): Promise<{
  enabled: boolean
  items: MenuItemRow[]
}> {
  const supabase = createAnonClient()
  const [settings, items] = await Promise.all([
    supabase
      .from("restaurant_settings")
      .select("chefs_picks_enabled")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .eq("popular", true)
      .order("sort_order", { ascending: true })
      .limit(CHEFS_PICKS_LIMIT),
  ])

  if (settings.error) {
    console.error(
      "[menu] get chef picks setting error:",
      settings.error.message,
    )
  }
  if (items.error) {
    console.error("[menu] get chef picks error:", items.error.message)
  }

  return {
    enabled: settings.data?.chefs_picks_enabled ?? true,
    items: items.error
      ? mockMenuRows(true)
          .filter((item) => item.popular)
          .slice(0, CHEFS_PICKS_LIMIT)
      : ((items.data ?? []) as MenuItemRow[]),
  }
}

export async function setChefsPicksEnabled(
  enabled: boolean,
): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const { error } = await createServiceClient()
    .from("restaurant_settings")
    .upsert({
      id: 1,
      chefs_picks_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
  if (error) {
    console.error("[menu] setChefsPicksEnabled error:", error.message)
    return { error: "Could not update the chef's-picks section." }
  }
  revalidatePath("/", "layout")
  revalidatePath("/admin/menu")
  return {}
}

/** Staff-only: fetch all items including unavailable ones. */
export async function getAllMenuItems(): Promise<MenuItemRow[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

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
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const supabase = await createClient()
  if (item.popular) {
    const { data: existing } = await supabase
      .from("menu_items")
      .select("popular")
      .eq("id", item.id)
      .maybeSingle()
    if (
      !existing?.popular &&
      (await wouldExceedChefsPicksLimit(supabase, item.id))
    ) {
      return { error: CHEFS_PICKS_LIMIT_ERROR }
    }
  }

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
  revalidatePath("/")
  revalidatePath("/admin/menu")
  return { row: data as MenuItemRow }
}

export async function createMenuItem(
  item: Omit<MenuItemRow, "id" | "slug" | "created_at">,
): Promise<{ row?: MenuItemRow; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const supabase = await createClient()
  if (item.popular && (await wouldExceedChefsPicksLimit(supabase))) {
    return { error: CHEFS_PICKS_LIMIT_ERROR }
  }

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
  revalidatePath("/")
  revalidatePath("/admin/menu")
  return { row: data as MenuItemRow }
}

export async function deleteMenuItem(id: string): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const supabase = await createClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  if (error) {
    console.error("[menu] deleteMenuItem error:", error.message)
    return { error: error.message }
  }
  revalidatePath("/menu")
  revalidatePath("/")
  revalidatePath("/admin/menu")
  return {}
}

export async function toggleMenuItemAvailability(
  id: string,
  available: boolean,
): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

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
  revalidatePath("/")
  revalidatePath("/admin/menu")
  return {}
}

// Shared mock / seed data for the MVP. Menu content is sourced from lib/akta-menu.json.

export {
  type MenuId,
  type MenuItem,
  type MenuMeta,
  MENUS,
  MENU_ITEMS,
  MENU_IDS,
  getMenuMeta,
  getItemsForMenu,
  slugify,
  parsePriceValue,
} from "@/lib/akta-menu"

import { MENU_ITEMS } from "@/lib/akta-menu"

export const RESTAURANT = {
  name: "äkta",
  tagline: "Cuisine de saison & bar à vins · Genève",
  address: "Boulevard de la Cluse 20, 1205 Genève",
  phone: "+41 22 566 29 25",
  hours: "Mar–Ven · 12:00–14:00 & 18:00–23:00 · Sam · 18:00–23:00",
}

export type TableStatus = "available" | "seated" | "reserved" | "cleaning"

export interface RestaurantTable {
  id: string
  label: string
  seats: number
  status: TableStatus
  x: number
  y: number
  shape: "round" | "square" | "rect"
}

export const TABLES: RestaurantTable[] = [
  { id: "t1", label: "1", seats: 2, status: "available", x: 0, y: 0, shape: "round" },
  { id: "t2", label: "2", seats: 2, status: "seated", x: 1, y: 0, shape: "round" },
  { id: "t3", label: "3", seats: 4, status: "reserved", x: 2, y: 0, shape: "square" },
  { id: "t4", label: "4", seats: 4, status: "available", x: 3, y: 0, shape: "square" },
  { id: "t5", label: "5", seats: 6, status: "seated", x: 0, y: 1, shape: "rect" },
  { id: "t6", label: "6", seats: 4, status: "cleaning", x: 2, y: 1, shape: "square" },
  { id: "t7", label: "7", seats: 2, status: "available", x: 3, y: 1, shape: "round" },
  { id: "t8", label: "8", seats: 8, status: "reserved", x: 0, y: 2, shape: "rect" },
  { id: "t9", label: "9", seats: 4, status: "available", x: 2, y: 2, shape: "square" },
  { id: "t10", label: "10", seats: 2, status: "seated", x: 3, y: 2, shape: "round" },
]

export const TABLE_STATUS_META: Record<
  TableStatus,
  { label: string; color: string; dot: string }
> = {
  available: { label: "Available", color: "bg-accent/10 text-accent border-accent/30", dot: "bg-accent" },
  seated: { label: "Seated", color: "bg-primary/10 text-primary border-primary/30", dot: "bg-primary" },
  reserved: { label: "Reserved", color: "bg-chart-3/15 text-chart-3 border-chart-3/30", dot: "bg-chart-3" },
  cleaning: { label: "Cleaning", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
}

export type ReservationStatus = "confirmed" | "seated" | "completed" | "cancelled"

export interface Reservation {
  id: string
  guestName: string
  partySize: number
  time: string
  date: string
  tableLabel?: string
  status: ReservationStatus
  phone: string
  notes?: string
}

const today = new Date().toISOString().slice(0, 10)

export const RESERVATIONS: Reservation[] = [
  { id: "r1", guestName: "Amelia Brooks", partySize: 2, time: "17:30", date: today, tableLabel: "1", status: "completed", phone: "(503) 555-0111" },
  { id: "r2", guestName: "Daniel Cho", partySize: 4, time: "18:00", date: today, tableLabel: "3", status: "seated", phone: "(503) 555-0122", notes: "Anniversary — dessert plate" },
  { id: "r3", guestName: "The Patel Party", partySize: 8, time: "18:30", date: today, tableLabel: "8", status: "confirmed", phone: "(503) 555-0133", notes: "1 high chair" },
  { id: "r4", guestName: "Marcus Webb", partySize: 2, time: "19:00", date: today, status: "confirmed", phone: "(503) 555-0144" },
  { id: "r5", guestName: "Sofia Reyes", partySize: 6, time: "19:30", date: today, status: "confirmed", phone: "(503) 555-0155", notes: "Gluten-free guest" },
  { id: "r6", guestName: "Liam O'Connor", partySize: 4, time: "20:00", date: today, status: "cancelled", phone: "(503) 555-0166" },
  { id: "r7", guestName: "Grace Lin", partySize: 2, time: "20:30", date: today, status: "confirmed", phone: "(503) 555-0177" },
]

export const TIME_SLOTS = [
  "17:00", "17:30", "18:00", "18:30", "19:00",
  "19:30", "20:00", "20:30", "21:00", "21:30",
]

export const UNAVAILABLE_SLOTS = ["18:30", "20:00"]

export type OrderTicketStatus = "new" | "preparing" | "ready"

export interface OrderLine {
  itemId: string
  name: string
  qty: number
  notes?: string
}

export interface OrderTicket {
  id: string
  table: string
  server: string
  placedAt: string
  placedAtMs: number
  status: OrderTicketStatus
  lines: OrderLine[]
}

function minutesAgo(mins: number): { placedAt: string; placedAtMs: number } {
  const d = new Date(Date.now() - mins * 60_000)
  return {
    placedAtMs: d.getTime(),
    placedAt: `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`,
  }
}

function findItem(namePart: string) {
  return MENU_ITEMS.find((m) => m.name.includes(namePart))
}

const entrecote = findItem("Entrecôte de bœuf 350g")
const tartinade = findItem("Tartinade chèvre")
const osMoelle = findItem("Os à moelle")
const porc = findItem("Porc, patate douce")
const espresso = findItem("Espresso Martini")
const cacio = findItem("Millefeuille pomme de terre")

export const INITIAL_TICKETS: OrderTicket[] = [
  {
    id: "ord-201",
    table: "5",
    server: "Maya",
    ...minutesAgo(3),
    status: "new",
    lines: [
      { itemId: entrecote?.id ?? "soir", name: entrecote?.name ?? "Entrecôte de bœuf 350g", qty: 2 },
      { itemId: tartinade?.id ?? "soir", name: tartinade?.name ?? "Tartinade chèvre, toast de focaccia", qty: 1, notes: "sans gluten" },
    ],
  },
  {
    id: "ord-200",
    table: "2",
    server: "Jon",
    ...minutesAgo(9),
    status: "preparing",
    lines: [
      { itemId: osMoelle?.id ?? "soir", name: osMoelle?.name ?? "Os à moelle, gremolata", qty: 1 },
      { itemId: porc?.id ?? "soir", name: porc?.name ?? "Porc, patate douce, cacahuète", qty: 1 },
      { itemId: espresso?.id ?? "boissons", name: espresso?.name ?? "Espresso Martini", qty: 2 },
    ],
  },
  {
    id: "ord-199",
    table: "10",
    server: "Maya",
    ...minutesAgo(14),
    status: "ready",
    lines: [{ itemId: cacio?.id ?? "soir", name: cacio?.name ?? "Millefeuille pomme de terre, mayo paprika", qty: 2 }],
  },
]

export const SERVERS = ["Maya", "Jon", "Priya", "Dev"]

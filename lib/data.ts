// Shared mock / seed data for the MVP template. Menu content is sourced from
// lib/menu-catalog.json (sample catalog — replace with the restaurant's own).

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
} from "@/lib/menu-catalog"

import { MENU_ITEMS } from "@/lib/menu-catalog"

export const RESTAURANT = {
  name: "Restaurant Link",
  tagline: "Reservations, menu, and service — one platform",
  address: "123 Main Street",
  phone: "+1 555 0100",
  hours: "Mon–Sat · 11:00–22:00",
}

export type TableStatus =
  "available" | "seated" | "reserved" | "cleaning" | "out_of_service"

export interface RestaurantTable {
  id: string
  label: string
  seats: number
  status: TableStatus
  expectedMinutes: number
  x: number
  y: number
  shape: "round" | "square" | "rect"
}

const DEFAULT_TABLE_MINUTES = 90

export const TABLES: RestaurantTable[] = [
  {
    id: "t1",
    label: "1",
    seats: 2,
    status: "available",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 0,
    y: 0,
    shape: "square",
  },
  {
    id: "t2",
    label: "2",
    seats: 2,
    status: "seated",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 1,
    y: 0,
    shape: "square",
  },
  {
    id: "t3",
    label: "3",
    seats: 4,
    status: "reserved",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 2,
    y: 0,
    shape: "square",
  },
  {
    id: "t4",
    label: "4",
    seats: 4,
    status: "available",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 3,
    y: 0,
    shape: "square",
  },
  {
    id: "t5",
    label: "5",
    seats: 6,
    status: "seated",
    expectedMinutes: 120,
    x: 0,
    y: 1,
    shape: "square",
  },
  {
    id: "t6",
    label: "6",
    seats: 4,
    status: "cleaning",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 2,
    y: 1,
    shape: "square",
  },
  {
    id: "t7",
    label: "7",
    seats: 2,
    status: "available",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 3,
    y: 1,
    shape: "square",
  },
  {
    id: "t8",
    label: "8",
    seats: 8,
    status: "reserved",
    expectedMinutes: 120,
    x: 0,
    y: 2,
    shape: "square",
  },
  {
    id: "t9",
    label: "9",
    seats: 4,
    status: "available",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 2,
    y: 2,
    shape: "square",
  },
  {
    id: "t10",
    label: "10",
    seats: 2,
    status: "seated",
    expectedMinutes: DEFAULT_TABLE_MINUTES,
    x: 3,
    y: 2,
    shape: "square",
  },
]

export const TABLE_STATUS_META: Record<
  TableStatus,
  { label: string; color: string; dot: string }
> = {
  available: {
    label: "Available",
    color: "bg-accent/10 text-accent border-accent/30",
    dot: "bg-accent",
  },
  seated: {
    label: "Seated",
    color: "bg-primary/10 text-primary border-primary/30",
    dot: "bg-primary",
  },
  reserved: {
    label: "Reserved",
    color: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    dot: "bg-chart-3",
  },
  cleaning: {
    label: "Cleaning",
    color: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  out_of_service: {
    label: "Out of service",
    color: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
}

export type ReservationStatus =
  "confirmed" | "seated" | "completed" | "cancelled" | "no_show"

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
  {
    id: "r1",
    guestName: "Amelia Brooks",
    partySize: 2,
    time: "17:30",
    date: today,
    tableLabel: "1",
    status: "completed",
    phone: "(503) 555-0111",
  },
  {
    id: "r2",
    guestName: "Daniel Cho",
    partySize: 4,
    time: "18:00",
    date: today,
    tableLabel: "3",
    status: "seated",
    phone: "(503) 555-0122",
    notes: "Anniversary — dessert plate",
  },
  {
    id: "r3",
    guestName: "The Patel Party",
    partySize: 8,
    time: "18:30",
    date: today,
    tableLabel: "8",
    status: "confirmed",
    phone: "(503) 555-0133",
    notes: "1 high chair",
  },
  {
    id: "r4",
    guestName: "Marcus Webb",
    partySize: 2,
    time: "19:00",
    date: today,
    status: "confirmed",
    phone: "(503) 555-0144",
  },
  {
    id: "r5",
    guestName: "Sofia Reyes",
    partySize: 6,
    time: "19:30",
    date: today,
    status: "confirmed",
    phone: "(503) 555-0155",
    notes: "Gluten-free guest",
  },
  {
    id: "r6",
    guestName: "Liam O'Connor",
    partySize: 4,
    time: "20:00",
    date: today,
    status: "cancelled",
    phone: "(503) 555-0166",
  },
  {
    id: "r7",
    guestName: "Grace Lin",
    partySize: 2,
    time: "20:30",
    date: today,
    status: "confirmed",
    phone: "(503) 555-0177",
  },
]

export const TIME_SLOTS = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
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
      {
        itemId: entrecote?.id ?? "soir",
        name: entrecote?.name ?? "Entrecôte de bœuf 350g",
        qty: 2,
      },
      {
        itemId: tartinade?.id ?? "soir",
        name: tartinade?.name ?? "Tartinade chèvre, toast de focaccia",
        qty: 1,
        notes: "sans gluten",
      },
    ],
  },
  {
    id: "ord-200",
    table: "2",
    server: "Jon",
    ...minutesAgo(9),
    status: "preparing",
    lines: [
      {
        itemId: osMoelle?.id ?? "soir",
        name: osMoelle?.name ?? "Os à moelle, gremolata",
        qty: 1,
      },
      {
        itemId: porc?.id ?? "soir",
        name: porc?.name ?? "Porc, patate douce, cacahuète",
        qty: 1,
      },
      {
        itemId: espresso?.id ?? "boissons",
        name: espresso?.name ?? "Espresso Martini",
        qty: 2,
      },
    ],
  },
  {
    id: "ord-199",
    table: "10",
    server: "Maya",
    ...minutesAgo(14),
    status: "ready",
    lines: [
      {
        itemId: cacio?.id ?? "soir",
        name: cacio?.name ?? "Millefeuille pomme de terre, mayo paprika",
        qty: 2,
      },
    ],
  },
]

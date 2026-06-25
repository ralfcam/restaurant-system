// Shared mock data for the MVP. This will be replaced by Supabase queries later.

export const RESTAURANT = {
  name: "Tavola",
  tagline: "Seasonal Italian kitchen & wine bar",
  address: "128 Vine Street, Portland, OR",
  phone: "(503) 555-0148",
  hours: "Tue–Sun · 5:00pm – 10:30pm",
}

export type MenuCategory =
  | "Antipasti"
  | "Pasta"
  | "Mains"
  | "Dessert"
  | "Drinks"

export type Allergen = "gluten" | "dairy" | "nuts" | "shellfish" | "egg" | "vegan"

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: MenuCategory
  allergens: Allergen[]
  image?: string
  popular?: boolean
}

export const MENU_CATEGORIES: MenuCategory[] = [
  "Antipasti",
  "Pasta",
  "Mains",
  "Dessert",
  "Drinks",
]

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "m1",
    name: "Burrata & Heirloom Tomato",
    description:
      "Creamy burrata, marinated heirloom tomatoes, basil oil, aged balsamic, grilled sourdough.",
    price: 16,
    category: "Antipasti",
    allergens: ["dairy", "gluten"],
    image: "/images/menu/burrata.png",
    popular: true,
  },
  {
    id: "m2",
    name: "Crispy Calamari",
    description: "Lightly fried calamari, lemon aioli, pickled chili, herbs.",
    price: 18,
    category: "Antipasti",
    allergens: ["gluten", "shellfish", "egg"],
    image: "/images/menu/calamari.png",
  },
  {
    id: "m3",
    name: "Tagliatelle Bolognese",
    description:
      "House-made tagliatelle, slow-braised beef and pork ragù, Parmigiano.",
    price: 26,
    category: "Pasta",
    allergens: ["gluten", "dairy", "egg"],
    image: "/images/menu/tagliatelle.png",
    popular: true,
  },
  {
    id: "m4",
    name: "Cacio e Pepe",
    description: "Spaghetti, Pecorino Romano, toasted black pepper, butter.",
    price: 22,
    category: "Pasta",
    allergens: ["gluten", "dairy"],
    image: "/images/menu/cacio-e-pepe.png",
  },
  {
    id: "m5",
    name: "Wild Mushroom Risotto",
    description: "Carnaroli rice, seasonal mushrooms, white wine, truffle oil.",
    price: 24,
    category: "Pasta",
    allergens: ["dairy", "vegan"],
    image: "/images/menu/risotto.png",
  },
  {
    id: "m6",
    name: "Branzino al Forno",
    description:
      "Whole roasted Mediterranean sea bass, salsa verde, charred lemon.",
    price: 34,
    category: "Mains",
    allergens: [],
    image: "/images/menu/branzino.png",
    popular: true,
  },
  {
    id: "m7",
    name: "Bistecca alla Fiorentina",
    description: "28-day dry-aged ribeye, rosemary, olive oil, sea salt.",
    price: 52,
    category: "Mains",
    allergens: [],
    image: "/images/menu/bistecca.png",
  },
  {
    id: "m8",
    name: "Tiramisù",
    description: "Espresso-soaked savoiardi, mascarpone cream, cocoa.",
    price: 12,
    category: "Dessert",
    allergens: ["dairy", "gluten", "egg"],
    image: "/images/menu/tiramisu.png",
    popular: true,
  },
  {
    id: "m9",
    name: "Affogato",
    description: "Vanilla gelato drowned in a shot of hot espresso.",
    price: 10,
    category: "Dessert",
    allergens: ["dairy"],
    image: "/images/menu/affogato.png",
  },
  {
    id: "m10",
    name: "Negroni",
    description: "Gin, Campari, sweet vermouth, orange peel.",
    price: 15,
    category: "Drinks",
    allergens: [],
    image: "/images/menu/negroni.png",
  },
  {
    id: "m11",
    name: "Chianti Classico",
    description: "Glass of Tuscan red, bright cherry and spice.",
    price: 14,
    category: "Drinks",
    allergens: [],
    image: "/images/menu/chianti.png",
  },
  {
    id: "m12",
    name: "San Pellegrino",
    description: "Sparkling mineral water, 500ml.",
    price: 6,
    category: "Drinks",
    allergens: ["vegan"],
    image: "/images/menu/sparkling-water.png",
  },
]

export type TableStatus = "available" | "seated" | "reserved" | "cleaning"

export interface RestaurantTable {
  id: string
  label: string
  seats: number
  status: TableStatus
  x: number // grid position
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
  time: string // "18:30"
  date: string // ISO date
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

// A few slots are "full" to demonstrate the availability engine.
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
  placedAt: string // "19:42"
  placedAtMs: number // epoch ms, drives live aging on the KDS
  status: OrderTicketStatus
  lines: OrderLine[]
}

// Helper so seeded tickets age realistically relative to "now" on first load.
function minutesAgo(mins: number): { placedAt: string; placedAtMs: number } {
  const d = new Date(Date.now() - mins * 60_000)
  return {
    placedAtMs: d.getTime(),
    placedAt: `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`,
  }
}

export const INITIAL_TICKETS: OrderTicket[] = [
  {
    id: "ord-201",
    table: "5",
    server: "Maya",
    ...minutesAgo(3),
    status: "new",
    lines: [
      { itemId: "m3", name: "Tagliatelle Bolognese", qty: 2 },
      { itemId: "m1", name: "Burrata & Heirloom Tomato", qty: 1, notes: "no balsamic" },
    ],
  },
  {
    id: "ord-200",
    table: "2",
    server: "Jon",
    ...minutesAgo(9),
    status: "preparing",
    lines: [
      { itemId: "m6", name: "Branzino al Forno", qty: 1 },
      { itemId: "m5", name: "Wild Mushroom Risotto", qty: 1, notes: "vegan" },
      { itemId: "m11", name: "Chianti Classico", qty: 2 },
    ],
  },
  {
    id: "ord-199",
    table: "10",
    server: "Maya",
    ...minutesAgo(14),
    status: "ready",
    lines: [{ itemId: "m4", name: "Cacio e Pepe", qty: 2 }],
  },
]

export const SERVERS = ["Maya", "Jon", "Priya", "Dev"]

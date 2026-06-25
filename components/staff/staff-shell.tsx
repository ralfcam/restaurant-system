"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarClock,
  LayoutGrid,
  Receipt,
  ChefHat,
  UtensilsCrossed,
  ExternalLink,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RESTAURANT } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, role: "Admin" },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarClock, role: "Admin" },
  { href: "/admin/floor", label: "Floor Plan", icon: LayoutGrid, role: "Admin" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, role: "Admin" },
  { href: "/pos", label: "Point of Sale", icon: Receipt, role: "Cashier" },
  { href: "/kds", label: "Kitchen Display", icon: ChefHat, role: "Kitchen" },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            <span className="text-[10px] uppercase tracking-wide opacity-60">
              {item.role}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <UtensilsCrossed className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="font-heading text-lg font-semibold">{RESTAURANT.name}</p>
          <p className="text-xs text-sidebar-foreground/60">Staff Console</p>
        </div>
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto border-t border-sidebar-border p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ExternalLink className="size-4" />
          View guest site
        </Link>
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <Avatar className="size-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              AM
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">Alex Moreno</p>
            <p className="text-xs text-sidebar-foreground/60">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StaffShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-8">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="lg:hidden" />
              }
            >
              <Menu className="size-5" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="truncate text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

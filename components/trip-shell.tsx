"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import {
  Bell,
  CalendarDays,
  Home,
  MapIcon,
  MapPinIcon,
  Radio,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SiteHeader } from "@/components/site-header"
import StatusBadge from "@/components/StatusBadge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useTripContext } from "@/lib/trip-context"

type TripShellRole = "parent" | "monitor"

const roleLabels: Record<TripShellRole, string> = {
  parent: "Apoderado",
  monitor: "Monitor",
}

export function TripShell({
  role,
  children,
}: {
  role: TripShellRole
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const tripId = params?.tripId as string
  const { trip, unreadCount } = useTripContext()

  const base = `/${role}/${tripId}`
  const navItems =
    role === "parent"
      ? [
          { title: "Resumen", url: base, icon: Home },
          { title: "Mapa", url: `${base}/map`, icon: MapIcon },
          { title: "Itinerario", url: `${base}/itinerary`, icon: CalendarDays },
          { title: "Comunicados", url: `${base}/announcements`, icon: Bell },
        ]
      : [{ title: "Panel monitor", url: base, icon: Radio }]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="offcanvas" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                <Link href="/">
                  <MapPinIcon className="h-5 w-5" />
                  <span className="text-base font-semibold">Meridiano Cero</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-auto items-start py-2" tooltip={trip?.name ?? "Gira"}>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{trip?.name ?? "Cargando gira..."}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {trip?.school.name ?? roleLabels[role]}
                  </span>
                </div>
                {trip && <SidebarMenuBadge>{roleLabels[role]}</SidebarMenuBadge>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain
            items={navItems.map((item) => ({
              ...item,
              isActive:
                item.url === base
                  ? pathname === item.url
                  : pathname.startsWith(item.url),
            }))}
          />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <SiteHeader
          title={role === "parent" ? "Portal apoderado" : "Panel monitor"}
          subtitle={trip?.name}
          right={
            <div className="flex items-center gap-2">
              {role === "parent" && unreadCount > 0 ? (
                <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                  {unreadCount} nuevos
                </span>
              ) : null}
              {trip ? <StatusBadge status={trip.status} /> : null}
            </div>
          }
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

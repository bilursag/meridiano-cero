"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconHelp,
  IconInnerShadowTop,
  IconMap,
  IconReport,
  IconRoute,
  IconSearch,
  IconSettings,
  IconTicket,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useCommandMenu } from "@/lib/command-menu-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMainItems = [
  { title: "Dashboard", url: "/admin", icon: IconDashboard },
  { title: "Giras", url: "/admin/trips", icon: IconRoute },
  { title: "Analítica", url: "/admin/analytics", icon: IconChartBar },
  { title: "Mapa operativo", url: "/admin/map", icon: IconMap },
  { title: "Equipo", url: "/admin/team", icon: IconUsers },
]

const documentItems = [
  { name: "Códigos", url: "/admin/codes", icon: IconTicket },
  { name: "Reportes", url: "/admin/reports", icon: IconReport },
  { name: "Colegios", url: "/admin/schools", icon: IconDatabase },
]

const data = {
  user: {
    name: "Administrador",
    email: "",
    avatar: "",
  },
  navSecondary: [
    { title: "Configuración", url: "/admin/settings", icon: IconSettings },
    { title: "Ayuda", url: "/admin/help", icon: IconHelp },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { setOpen: setSearchOpen } = useCommandMenu()

  const navMain = navMainItems.map((item) => ({
    ...item,
    isActive: item.url === "/admin" ? pathname === item.url : pathname.startsWith(item.url),
  }))

  const navSecondary = [
    ...data.navSecondary,
    { title: "Buscar", icon: IconSearch, onSelect: () => setSearchOpen(true) },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/admin">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Meridiano Cero</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavDocuments items={documentItems} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

"use client"

import Link from "next/link"
import type { ComponentType } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavIcon = ComponentType<{ className?: string }>

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: NavIcon
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Gestión</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

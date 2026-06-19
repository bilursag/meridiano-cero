import type React from "react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title,
  subtitle,
  right,
  showSidebarTrigger = true,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  showSidebarTrigger?: boolean
}) {
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear md:rounded-t-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showSidebarTrigger ? (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </>
        ) : null}
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-base font-medium">{title}</h1>
          {subtitle ? (
            <span className="hidden truncate text-sm text-muted-foreground sm:block">
              {subtitle}
            </span>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  )
}

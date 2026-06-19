import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'

interface DashboardHeaderProps {
  icon: ReactNode
  title: string
  subtitle?: string
  right?: ReactNode
}

export default function DashboardHeader({ icon, title, subtitle, right }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
        <ThemeToggle />
        <SignOutButton redirectUrl="/sign-in">
          <Button variant="ghost" size="sm">
            <LogOut size={15} /><span className="hidden sm:inline">Salir</span>
          </Button>
        </SignOutButton>
      </div>
    </header>
  )
}

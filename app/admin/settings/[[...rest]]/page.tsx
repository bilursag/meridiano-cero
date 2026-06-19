'use client'

import { UserProfile } from '@clerk/nextjs'
import { SiteHeader } from '@/components/site-header'

export default function AdminSettingsPage() {
  return (
    <>
      <SiteHeader title="Configuración" subtitle="Tu cuenta de administrador" />
      <div className="flex flex-1 flex-col items-center p-4 md:p-6">
        <UserProfile
          routing="path"
          path="/admin/settings"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'border border-border bg-card text-card-foreground shadow-sm w-full',
              headerTitle: 'text-card-foreground',
              headerSubtitle: 'text-muted-foreground',
            },
          }}
        />
      </div>
    </>
  )
}

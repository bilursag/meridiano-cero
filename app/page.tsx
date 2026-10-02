import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { SignIn } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { authAppearance } from '@/lib/clerk-appearance'
import { roleLabels } from '@/lib/labels'

export default async function RootPage() {
  const { userId } = await auth()
  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <SignIn routing="hash" appearance={authAppearance} />
        <Link href="/privacidad" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          Política de privacidad
        </Link>
      </div>
    )
  }

  const [admin, memberships] = await Promise.all([
    prisma.adminUser.findUnique({ where: { clerkUserId: userId } }),
    prisma.tripMembership.findMany({
      where: { clerkUserId: userId },
      include: { trip: { select: { name: true } } },
    }),
  ])

  if (admin) redirect('/admin')
  if (memberships.length === 0) redirect('/redeem')

  if (memberships.length === 1) {
    const [membership] = memberships
    redirect(membership.role === 'MONITOR' ? `/monitor/${membership.tripId}` : `/parent/${membership.tripId}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-2">
        <h1 className="text-lg font-semibold text-center mb-4">Selecciona un grupo</h1>
        {memberships.map((membership) => (
          <Link
            key={membership.id}
            href={membership.role === 'MONITOR' ? `/monitor/${membership.tripId}` : `/parent/${membership.tripId}`}
            className="block rounded-lg border border-border/50 px-4 py-3 hover:bg-accent transition-colors"
          >
            <p className="font-medium text-sm">{membership.trip.name}</p>
            <p className="text-xs text-muted-foreground">
              {roleLabels[membership.role]}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { TripShell } from "@/components/trip-shell"
import { TripProvider } from "@/lib/trip-context"

export default async function MonitorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params

  return (
    <TripProvider tripId={tripId}>
      <TripShell role="monitor">{children}</TripShell>
    </TripProvider>
  )
}

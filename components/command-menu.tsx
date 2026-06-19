"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconRoute, IconTicket } from "@tabler/icons-react"
import type { AccessCode, Trip } from "@prisma/client"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useCommandMenu } from "@/lib/command-menu-context"

type TripResult = Trip & { school: { name: string } }
type CodeResult = AccessCode & { trip: { id: string; name: string } }

export function CommandMenu() {
  const { open, setOpen } = useCommandMenu()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [trips, setTrips] = React.useState<TripResult[]>([])
  const [codes, setCodes] = React.useState<CodeResult[]>([])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, setOpen])

  React.useEffect(() => {
    const id = window.setTimeout(async () => {
      const trimmed = query.trim()
      if (!trimmed) {
        setTrips([])
        setCodes([])
        return
      }
      const res = await fetch(`/api/v1/admin/search?q=${encodeURIComponent(trimmed)}`)
      if (res.ok) {
        const data = await res.json()
        setTrips(data.trips)
        setCodes(data.codes)
      }
    }, 200)
    return () => window.clearTimeout(id)
  }, [query])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery("")
      setTrips([])
      setCodes([])
    }
  }

  function go(url: string) {
    handleOpenChange(false)
    router.push(url)
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Buscar giras, colegios o códigos…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() && trips.length === 0 && codes.length === 0 ? (
          <CommandEmpty>Sin resultados.</CommandEmpty>
        ) : null}
        {trips.length > 0 ? (
          <CommandGroup heading="Giras">
            {trips.map((trip) => (
              <CommandItem key={trip.id} value={trip.id} onSelect={() => go(`/admin/trips/${trip.id}`)}>
                <IconRoute />
                <div className="flex flex-col">
                  <span>{trip.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {trip.school.name} · {trip.destination}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {codes.length > 0 ? (
          <CommandGroup heading="Códigos">
            {codes.map((code) => (
              <CommandItem key={code.id} value={code.id} onSelect={() => go(`/admin/codes`)}>
                <IconTicket />
                <div className="flex flex-col">
                  <span className="font-mono">{code.code}</span>
                  <span className="text-xs text-muted-foreground">{code.trip.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

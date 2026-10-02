"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { TripForm, type EditableTrip } from "@/components/trip-form"

const FORM_ID = "edit-trip-sheet-form"

/** Every field of an existing trip, in the same form and Sheet as "Nuevo grupo". */
export function EditTripSheet({
  trip,
  open,
  onOpenChange,
  onSaved,
}: {
  trip: EditableTrip
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (trip: EditableTrip) => void
}) {
  const [formState, setFormState] = useState({ canSubmit: false, submitting: false })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>Editar grupo</SheetTitle>
          <SheetDescription>Los códigos de acceso se administran en la pestaña Personas.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          {/* SheetContent unmounts when closed, so each opening starts from the current trip. */}
          <TripForm
            formId={FORM_ID}
            className="flex flex-col gap-4"
            trip={trip}
            onStateChange={setFormState}
            onSuccess={(saved) => onSaved(saved as EditableTrip)}
          />
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button type="submit" form={FORM_ID} className="w-full" disabled={!formState.canSubmit}>
            {formState.submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

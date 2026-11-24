'use client'

import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type ComboboxOption = { value: string; label: string; description?: string }

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = 'Buscar…',
  emptyLabel = 'Sin resultados.',
  className,
  onCreate,
  createLabel = (query: string) => `Crear "${query}"`,
}: {
  options: ComboboxOption[]
  value: string | null
  onSelect: (value: string | null) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
  onCreate?: (query: string) => void
  createLabel?: (query: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const trimmedQuery = query.trim()
  const showCreate =
    !!onCreate &&
    !!trimmedQuery &&
    !options.some((option) => option.label.toLowerCase() === trimmedQuery.toLowerCase())

  return (
    // Modal: inside a Dialog (e.g. "Aplicar programa") the dialog's scroll lock blocked the wheel on
    // this list, which is portaled outside it. A modal popover takes over the lock and lets its own
    // list scroll.
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/* Never taller than the room left on screen: the list shrinks and scrolls instead of the search box going off the top. */}
      <PopoverContent
        collisionPadding={8}
        className="flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) flex-col p-0">
        <Command className="min-h-0">
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList className="min-h-0">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onSelect(option.value === value ? null : option.value)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <CheckIcon className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description ? (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
              {showCreate ? (
                <CommandItem
                  value={`__create__${trimmedQuery}`}
                  onSelect={() => {
                    onCreate?.(trimmedQuery)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  {createLabel(trimmedQuery)}
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

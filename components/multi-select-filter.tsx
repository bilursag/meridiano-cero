'use client'

import { useState } from 'react'
import { ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder,
  className,
}: {
  options: string[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', !selected.length && 'text-muted-foreground', className)}
        >
          <span className="flex items-center gap-1.5 truncate">
            {placeholder}
            {selected.length ? <Badge variant="secondary">{selected.length}</Badge> : null}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                  <Checkbox checked={selected.includes(option)} className="pointer-events-none" />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

"use client"

import * as React from "react"

const CommandMenuContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null)

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return <CommandMenuContext.Provider value={{ open, setOpen }}>{children}</CommandMenuContext.Provider>
}

export function useCommandMenu() {
  const context = React.useContext(CommandMenuContext)
  if (!context) throw new Error("useCommandMenu must be used within a CommandMenuProvider")
  return context
}

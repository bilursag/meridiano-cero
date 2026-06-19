"use client"

import * as React from "react"
import Link from "next/link"
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ColumnsIcon,
  ListPlusIcon,
  MoreVerticalIcon,
} from "lucide-react"
import type { AccessCode, Trip } from "@prisma/client"

import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type TripRow = Trip & { school: { name: string }; accessCodes: AccessCode[] }

function codeFor(trip: TripRow, role: "PARENT" | "MONITOR") {
  return trip.accessCodes.find((c) => c.role === role)?.code ?? "—"
}

const columns: ColumnDef<TripRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Nombre <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link href={`/parent/${row.original.id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
    enableHiding: false,
  },
  {
    id: "school",
    header: "Colegio",
    accessorFn: (row) => row.school.name,
    cell: ({ row }) => row.original.school.name,
  },
  {
    accessorKey: "destination",
    header: "Destino",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "day",
    header: "Día",
    cell: ({ row }) => `${row.original.currentDay}/${row.original.totalDays}`,
  },
  {
    id: "parentCode",
    header: "Código apoderado",
    cell: ({ row }) => <span className="font-mono text-xs">{codeFor(row.original, "PARENT")}</span>,
  },
  {
    id: "monitorCode",
    header: "Código monitor",
    cell: ({ row }) => <span className="font-mono text-xs">{codeFor(row.original, "MONITOR")}</span>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
            <MoreVerticalIcon />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/parent/${row.original.id}`}>Ver como apoderado</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/monitor/${row.original.id}`}>Ver como monitor</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export function DataTable({ data, toolbarAction }: { data: TripRow[]; toolbarAction?: React.ReactNode }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="flex w-full flex-col justify-start gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {[
            ["Operación", null],
            ["En terreno", data.filter((trip) => trip.status !== "FINISHED").length],
            ["Códigos", data.reduce((sum, trip) => sum + trip.accessCodes.length, 0)],
            ["Colegios", new Set(data.map((trip) => trip.school.name)).size],
          ].map(([label, count], index) => (
            <Button
              key={label}
              variant={index === 0 ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-md"
            >
              {label}
              {typeof count === "number" ? (
                <span className="rounded-sm bg-background px-1.5 text-xs text-muted-foreground">
                  {count}
                </span>
              ) : null}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ColumnsIcon />
                <span className="hidden lg:inline">Columnas</span>
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {toolbarAction ?? (
            <Button size="sm">
              <ListPlusIcon />
              Nueva sección
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="h-16">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Sin giras todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Filas por página
          </Label>
          <Select value={`${pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger className="w-20" id="rows-per-page">
              <SelectValue placeholder={pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Página {pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeftIcon />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

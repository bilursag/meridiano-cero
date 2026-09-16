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
  EyeIcon,
  ListPlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  RouteIcon,
  Trash2Icon,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import type { AccessCode, ItineraryStatus, Trip } from "@prisma/client"

import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { GlobalFilters } from "@/components/global-filters"
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

export type TripRow = Trip & {
  school: { name: string }
  accessCodes: AccessCode[]
  monitorNames: string[]
  itineraryItems: { dayNumber: number; title: string; status: ItineraryStatus }[]
}

function TripRowActions({ tripId, tripName, onDeleted }: { tripId: string; tripName: string; onDeleted: () => void }) {
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${tripName}"? Se borrará todo su itinerario, comunicados, códigos y equipo asociado. Esta acción no se puede deshacer.`)) {
      return
    }
    setDeleting(true)
    const res = await fetch(`/api/v1/trips/${tripId}`, { method: "DELETE" })
    setDeleting(false)
    if (res.ok) {
      toast.success("Grupo eliminado.")
      onDeleted()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? "No se pudo eliminar el grupo.")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
          size="icon"
          disabled={deleting}
        >
          <MoreVerticalIcon />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/admin/trips/${tripId}`}>
            <EyeIcon className="size-4" />
            Ver grupo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/trips/${tripId}?edit=1`}>
            <PencilIcon className="size-4" />
            Editar grupo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={handleDelete}
        >
          <Trash2Icon className="size-4" />
          Eliminar grupo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function buildColumns(onTripDeleted: () => void): ColumnDef<TripRow>[] {
  return [
  {
    accessorKey: "groupNumber",
    header: "N° Grupo",
    cell: ({ row }) => row.original.groupNumber || "—",
  },
  {
    accessorKey: "salesExecutive",
    header: "Ejecutivo",
    cell: ({ row }) => row.original.salesExecutive || "—",
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Nombre <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link href={`/admin/trips/${row.original.id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
    enableHiding: false,
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
    id: "inOut",
    header: "In-Out",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {format(new Date(row.original.startDate), "d MMM", { locale: es })}–
        {format(new Date(row.original.endDate), "d MMM", { locale: es })}
      </span>
    ),
  },
  {
    accessorKey: "hotel",
    header: "Hotel",
    cell: ({ row }) => row.original.hotel || "—",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <TripRowActions tripId={row.original.id} tripName={row.original.name} onDeleted={onTripDeleted} />
    ),
  },
  ]
}

export function DataTable({
  data,
  toolbarAction,
  onTripDeleted,
}: {
  data: TripRow[]
  toolbarAction?: React.ReactNode
  onTripDeleted?: () => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [search, setSearch] = React.useState("")
  const [schoolFilter, setSchoolFilter] = React.useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = React.useState<string[]>([])
  const [monitorFilter, setMonitorFilter] = React.useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active">("all")
  const columns = React.useMemo(() => buildColumns(onTripDeleted ?? (() => {})), [onTripDeleted])

  const schoolOptions = React.useMemo(
    () => Array.from(new Set(data.map((trip) => trip.school.name))).sort(),
    [data]
  )
  const destinationOptions = React.useMemo(
    () => Array.from(new Set(data.map((trip) => trip.destination))).sort(),
    [data]
  )
  const monitorOptions = React.useMemo(
    () => Array.from(new Set(data.flatMap((trip) => trip.monitorNames))).sort(),
    [data]
  )
  const executiveOptions = React.useMemo(
    () => Array.from(new Set(data.map((trip) => trip.salesExecutive).filter((v): v is string => !!v))).sort(),
    [data]
  )

  const filteredData = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.filter((trip) => {
      if (statusFilter === "active" && trip.status === "FINISHED") return false
      if (schoolFilter.length && !schoolFilter.includes(trip.school.name)) return false
      if (destinationFilter.length && !destinationFilter.includes(trip.destination)) return false
      if (monitorFilter.length && !trip.monitorNames.some((name) => monitorFilter.includes(name))) return false
      if (executiveFilter.length && (!trip.salesExecutive || !executiveFilter.includes(trip.salesExecutive))) return false
      if (query && !trip.name.toLowerCase().includes(query) && !trip.destination.toLowerCase().includes(query)) {
        return false
      }
      return true
    })
  }, [data, search, schoolFilter, destinationFilter, monitorFilter, executiveFilter, statusFilter])

  const table = useReactTable({
    data: filteredData,
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
          {(
            [
              ["Operación", "all", null],
              ["En terreno", "active", data.filter((trip) => trip.status !== "FINISHED").length],
              ["Códigos", null, data.reduce((sum, trip) => sum + trip.accessCodes.length, 0)],
            ] as const
          ).map(([label, filterValue, count]) => (
            <Button
              key={label}
              variant={filterValue !== null && statusFilter === filterValue ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-md"
              onClick={filterValue !== null ? () => setStatusFilter(filterValue) : undefined}
              disabled={filterValue === null}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <GlobalFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o destino…"
          schoolOptions={schoolOptions}
          schoolFilter={schoolFilter}
          onSchoolFilterChange={setSchoolFilter}
          destinationOptions={destinationOptions}
          destinationFilter={destinationFilter}
          onDestinationFilterChange={setDestinationFilter}
          monitorOptions={monitorOptions}
          monitorFilter={monitorFilter}
          onMonitorFilterChange={setMonitorFilter}
          executiveOptions={executiveOptions}
          executiveFilter={executiveFilter}
          onExecutiveFilterChange={setExecutiveFilter}
        />
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
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    icon={RouteIcon}
                    title={data.length ? "Sin resultados para estos filtros." : "Sin grupos todavía."}
                    description={
                      data.length ? "Prueba con otros filtros." : "Crea el primer grupo para empezar."
                    }
                  />
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

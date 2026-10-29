import * as React from "react"
import { motion } from "framer-motion"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"

export interface DataTableColumn<T> {
  id: string
  header: React.ReactNode
  /** Cell renderer. */
  cell: (row: T, index: number) => React.ReactNode
  /** Value used for sorting; enables a sortable header when present. */
  sortValue?: (row: T) => string | number | Date | null | undefined
  align?: "left" | "right" | "center"
  className?: string
  headerClassName?: string
  /** Hide this column below the md breakpoint (only relevant without mobileCard). */
  hideOnMobile?: boolean
  width?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  /** Card renderer used instead of the table under the md breakpoint. */
  mobileCard?: (row: T, index: number) => React.ReactNode
  empty?: React.ReactNode
  initialSort?: { id: string; dir: "asc" | "desc" }
  className?: string
  /** Max height for the scroll container; the header stays sticky. */
  maxHeight?: string
  caption?: string
  /** Highlight a row (e.g. currently selected). */
  isRowActive?: (row: T) => boolean
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
}

/** Typed data table: sortable headers, row hover, sticky header, staggered rows, card fallback on mobile. */
export default function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  mobileCard,
  empty,
  initialSort,
  className,
  maxHeight,
  caption,
  isRowActive,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState(initialSort ?? null)

  const rows = React.useMemo(() => {
    if (!sort) return data
    const col = columns.find((c) => c.id === sort.id)
    if (!col?.sortValue) return data
    const sorted = [...data].sort((a, b) => compare(col.sortValue!(a), col.sortValue!(b)))
    return sort.dir === "desc" ? sorted.reverse() : sorted
  }, [data, sort, columns])

  const toggleSort = (id: string) =>
    setSort((s) => (s?.id !== id ? { id, dir: "asc" } : s.dir === "asc" ? { id, dir: "desc" } : null))

  if (data.length === 0 && empty) return <>{empty}</>

  const align = (a?: "left" | "right" | "center") => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left")

  return (
    <div className={cn("w-full", className)}>
      {mobileCard && (
        <ul className="flex flex-col gap-2 md:hidden">
          {rows.map((row, i) => (
            <motion.li
              key={rowKey(row, i)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.base, ease: ease.out, delay: Math.min(i, 12) * 0.03 }}
            >
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  className="block w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-2"
                >
                  {mobileCard(row, i)}
                </button>
              ) : (
                <div className="rounded-lg border border-border bg-surface p-4">{mobileCard(row, i)}</div>
              )}
            </motion.li>
          ))}
        </ul>
      )}
      <div
        className={cn("overflow-auto rounded-lg border border-border bg-surface", mobileCard && "hidden md:block")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-[1] bg-surface-2/95 backdrop-blur">
            <tr className="border-b border-border">
              {columns.map((c) => {
                const active = sort?.id === c.id
                return (
                  <th
                    key={c.id}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "h-10 whitespace-nowrap px-4 text-[12px] font-medium text-muted-foreground",
                      align(c.align),
                      c.hideOnMobile && "hidden md:table-cell",
                      c.headerClassName,
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground",
                          active && "text-foreground",
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={rowKey(row, i)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: duration.base, delay: Math.min(i, 12) * 0.02 }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "border-b border-border transition-colors last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2",
                  isRowActive?.(row) && "bg-primary-soft hover:bg-primary-soft",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={cn("px-4 py-3 align-middle text-foreground", align(c.align), c.hideOnMobile && "hidden md:table-cell", c.className)}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { DataTable }

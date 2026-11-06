import * as React from "react"
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"
import { fieldClasses } from "./input"
import { floatingClasses } from "./popover"

export interface DatePickerProps {
  value?: string // ISO format: YYYY-MM-DD
  defaultValue?: string
  onChange?: (date: string) => void
  min?: string // ISO format: YYYY-MM-DD
  max?: string // ISO format: YYYY-MM-DD
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  id?: string
  name?: string
  required?: boolean
  clearable?: boolean
  "aria-label"?: string
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

export function formatDateDisplay(isoDate?: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-").map((p) => parseInt(p, 10))
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return isoDate
  }
  const [year, month, day] = parts
  const monthName = MONTH_NAMES[month - 1]?.slice(0, 3) || ""
  return `${monthName} ${day}, ${year}`
}

export function formatIsoDate(year: number, monthZeroIndexed: number, day: number): string {
  return `${year}-${padZero(monthZeroIndexed + 1)}-${padZero(day)}`
}

export function parseIsoDate(isoDate?: string): { year: number; month: number; day: number } | null {
  if (!isoDate) return null
  const parts = isoDate.split("-").map((p) => parseInt(p, 10))
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null
  }
  return { year: parts[0], month: parts[1] - 1, day: parts[2] }
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      min,
      max,
      placeholder = "Select date...",
      disabled = false,
      className,
      triggerClassName,
      id,
      name,
      required,
      clearable = true,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = React.useState<string>(defaultValue || "")
    const currentValue = isControlled ? controlledValue || "" : internalValue

    const [open, setOpen] = React.useState(false)

    // Current calendar view
    const today = React.useMemo(() => new Date(), [])
    const todayIso = React.useMemo(
      () => formatIsoDate(today.getFullYear(), today.getMonth(), today.getDate()),
      [today]
    )

    const parsedCurrent = React.useMemo(() => parseIsoDate(currentValue), [currentValue])

    const [viewYear, setViewYear] = React.useState<number>(
      parsedCurrent?.year ?? today.getFullYear()
    )
    const [viewMonth, setViewMonth] = React.useState<number>(
      parsedCurrent?.month ?? today.getMonth()
    )
    const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days")

    // Reset viewMode when popover closes
    React.useEffect(() => {
      if (!open) {
        setViewMode("days")
      }
    }, [open])

    // Sync view with value when opening or value changes
    React.useEffect(() => {
      if (parsedCurrent) {
        setViewYear(parsedCurrent.year)
        setViewMonth(parsedCurrent.month)
      }
    }, [currentValue])

    const handleSelectDate = (isoString: string) => {
      if (!isControlled) {
        setInternalValue(isoString)
      }
      onChange?.(isoString)
      setOpen(false)
    }

    const handleClear = (e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (!isControlled) {
        setInternalValue("")
      }
      onChange?.("")
      setOpen(false)
    }

    const handleGoToToday = () => {
      handleSelectDate(todayIso)
    }

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11)
        setViewYear((y) => y - 1)
      } else {
        setViewMonth((m) => m - 1)
      }
    }

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear((y) => y + 1)
      } else {
        setViewMonth((m) => m + 1)
      }
    }

    // Days in current view month
    const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sunday

    // Days in previous month to fill the first row
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
    const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const day = daysInPrevMonth - firstDayOfWeek + i + 1
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      return {
        day,
        month: prevMonth,
        year: prevYear,
        iso: formatIsoDate(prevYear, prevMonth, day),
        isCurrentMonth: false,
      }
    })

    const currentMonthDays = Array.from({ length: daysInViewMonth }, (_, i) => {
      const day = i + 1
      return {
        day,
        month: viewMonth,
        year: viewYear,
        iso: formatIsoDate(viewYear, viewMonth, day),
        isCurrentMonth: true,
      }
    })

    // Total cells to make clean 5 or 6 weeks (multiple of 7)
    const filledCount = prevMonthDays.length + currentMonthDays.length
    const nextMonthDaysCount = filledCount % 7 === 0 ? 0 : 7 - (filledCount % 7)
    const nextMonthDays = Array.from({ length: nextMonthDaysCount }, (_, i) => {
      const day = i + 1
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
      return {
        day,
        month: nextMonth,
        year: nextYear,
        iso: formatIsoDate(nextYear, nextMonth, day),
        isCurrentMonth: false,
      }
    })

    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]

    const isDateDisabled = (iso: string) => {
      if (min && iso < min) return true
      if (max && iso > max) return true
      return false
    }

    // Years for quick picker (from 1970 to 2050)
    const years = React.useMemo(() => {
      const current = today.getFullYear()
      const start = current - 50
      const end = current + 30
      const list: number[] = []
      for (let y = start; y <= end; y++) {
        list.push(y)
      }
      return list
    }, [today])

    return (
      <div className={cn("relative inline-block w-full", className)}>
        {/* Hidden input for form data submission */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={currentValue}
            required={required}
            disabled={disabled}
          />
        )}

        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              ref={ref}
              id={id}
              type="button"
              disabled={disabled}
              aria-label={ariaLabel || placeholder}
              className={cn(
                fieldClasses,
                "flex h-9 w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-all select-none",
                !currentValue && "text-subtle-foreground",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                triggerClassName
              )}
            >
              <span className="truncate">
                {currentValue ? formatDateDisplay(currentValue) : placeholder}
              </span>

              <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                {clearable && currentValue && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleClear()
                    }}
                    className="p-0.5 rounded-sm hover:text-foreground hover:bg-surface-2 transition-colors focus:outline-none"
                    title="Clear date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={6}
              className={cn(
                floatingClasses,
                "w-[290px] p-3 shadow-xl border border-border/80 bg-surface dark:bg-[#1a1a1e] z-50 rounded-xl"
              )}
            >
              {/* Calendar Month & Year Header */}
              <div className="flex items-center justify-between gap-1 pb-2.5 mb-2 border-b border-border/60">
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setViewMode((m) => (m === "months" ? "days" : "months"))}
                    className={cn(
                      "text-xs font-semibold px-2 py-1 rounded-md transition-colors flex items-center gap-1 text-foreground hover:bg-surface-2",
                      viewMode === "months" && "bg-primary-soft text-primary font-bold"
                    )}
                    title="Choose month"
                  >
                    <span>{MONTH_NAMES[viewMonth]}</span>
                    <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", viewMode === "months" && "rotate-180")} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode((m) => (m === "years" ? "days" : "years"))}
                    className={cn(
                      "text-xs font-semibold px-2 py-1 rounded-md transition-colors flex items-center gap-1 text-foreground hover:bg-surface-2",
                      viewMode === "years" && "bg-primary-soft text-primary font-bold"
                    )}
                    title="Choose year"
                  >
                    <span>{viewYear}</span>
                    <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", viewMode === "years" && "rotate-180")} />
                  </button>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors focus:outline-none"
                    title="Previous month"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors focus:outline-none"
                    title="Next month"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Month Picker View */}
              {viewMode === "months" && (
                <div className="grid grid-cols-3 gap-1.5 py-2">
                  {MONTH_NAMES.map((name, idx) => {
                    const isSelected = idx === viewMonth
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setViewMonth(idx)
                          setViewMode("days")
                        }}
                        className={cn(
                          "py-2 rounded-lg text-xs font-medium transition-colors text-foreground hover:bg-surface-2",
                          isSelected && "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                        )}
                      >
                        {name.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Year Picker View */}
              {viewMode === "years" && (
                <div className="grid grid-cols-4 gap-1.5 max-h-[190px] overflow-y-auto py-2 pr-1">
                  {years.map((y) => {
                    const isSelected = y === viewYear
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setViewYear(y)
                          setViewMode("days")
                        }}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-medium transition-colors text-foreground hover:bg-surface-2",
                          isSelected && "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                        )}
                      >
                        {y}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Day Calendar View */}
              {viewMode === "days" && (
                <>
                  {/* Days of Week Row */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {DAYS_OF_WEEK.map((d) => (
                      <span
                        key={d}
                        className="text-[11px] font-semibold text-muted-foreground py-0.5 select-none"
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center" role="grid">
                    {allDays.map((cell) => {
                      const isSelected = cell.iso === currentValue
                      const isToday = cell.iso === todayIso
                      const disabledDay = isDateDisabled(cell.iso)

                      return (
                        <button
                          key={cell.iso}
                          type="button"
                          disabled={disabledDay}
                          onClick={() => handleSelectDate(cell.iso)}
                          className={cn(
                            "h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-all select-none flex items-center justify-center",
                            !cell.isCurrentMonth && "text-muted-foreground/40",
                            cell.isCurrentMonth && "text-foreground",
                            !isSelected && !disabledDay && "hover:bg-primary-soft hover:text-primary",
                            isToday && !isSelected && "border border-primary font-bold text-primary",
                            isSelected &&
                              "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary-hover",
                            disabledDay && "opacity-25 cursor-not-allowed hover:bg-transparent"
                          )}
                          aria-label={cell.iso}
                          aria-selected={isSelected}
                        >
                          {cell.day}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Bottom Quick Select: Clear / Today */}
              <div className="flex items-center justify-between border-t border-border/60 pt-2.5 mt-2.5 px-0.5">
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors focus:outline-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none"
                >
                  Today
                </button>
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    )
  }
)

DatePicker.displayName = "DatePicker"

export { DatePicker }
export default DatePicker

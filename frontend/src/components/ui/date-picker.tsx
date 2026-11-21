import * as React from "react"
import { Calendar as CalendarIcon, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react"
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

export interface TimePickerProps {
  value?: string // 24h format: HH:mm
  defaultValue?: string
  onChange?: (time: string) => void
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

export interface DateTimePickerProps {
  value?: string // Local ISO format: YYYY-MM-DDTHH:mm
  defaultValue?: string
  onChange?: (value: string) => void
  min?: string // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  max?: string // YYYY-MM-DD or YYYY-MM-DDTHH:mm
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
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i)
const QUICK_TIMES = [
  { label: "9:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "7:30 PM", value: "19:30" },
] as const

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

export function parseTime(hhmm?: string): { hour: number; minute: number } | null {
  if (!hhmm) return null
  const parts = hhmm.split(":").map((p) => parseInt(p, 10))
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  const hour = Math.max(0, Math.min(23, parts[0]))
  const minute = Math.max(0, Math.min(59, parts[1]))
  return { hour, minute }
}

function formatHourShort(hour24: number): string {
  const period = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 || 12
  return `${hour12} ${period}`
}

export function formatTimeDisplay(hhmm?: string): string {
  const parsed = parseTime(hhmm)
  if (!parsed) return hhmm || ""
  const period = parsed.hour >= 12 ? "PM" : "AM"
  const hour12 = parsed.hour % 12 || 12
  return `${hour12}:${padZero(parsed.minute)} ${period}`
}

export function formatDateTimeDisplay(isoDateTime?: string): string {
  if (!isoDateTime) return ""
  const [datePart, timePart] = isoDateTime.split("T")
  const dateLabel = formatDateDisplay(datePart)
  if (!timePart) return dateLabel
  return `${dateLabel} · ${formatTimeDisplay(timePart)}`
}

function splitDateTime(val?: string): { date: string; time: string } {
  if (!val) return { date: "", time: "" }
  const [datePart = "", timePart = ""] = val.split("T")
  return { date: datePart.slice(0, 10), time: timePart.slice(0, 5) }
}

function localNowDateTime(): { date: string; time: string } {
  const now = new Date()
  return {
    date: formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate()),
    time: `${padZero(now.getHours())}:${padZero(now.getMinutes())}`,
  }
}

interface CalendarGridProps {
  selectedDate: string
  minDate?: string
  maxDate?: string
  open: boolean
  onSelectDate: (isoDate: string) => void
}

function CalendarGrid({ selectedDate, minDate, maxDate, open, onSelectDate }: CalendarGridProps) {
  const today = React.useMemo(() => new Date(), [])
  const todayIso = React.useMemo(
    () => formatIsoDate(today.getFullYear(), today.getMonth(), today.getDate()),
    [today],
  )
  const parsedCurrent = React.useMemo(() => parseIsoDate(selectedDate), [selectedDate])

  const [viewYear, setViewYear] = React.useState<number>(parsedCurrent?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = React.useState<number>(parsedCurrent?.month ?? today.getMonth())
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days")

  React.useEffect(() => {
    if (!open) setViewMode("days")
  }, [open])

  React.useEffect(() => {
    if (parsedCurrent) {
      setViewYear(parsedCurrent.year)
      setViewMonth(parsedCurrent.month)
    }
  }, [parsedCurrent])

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

  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const day = daysInPrevMonth - firstDayOfWeek + i + 1
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
    return { day, iso: formatIsoDate(prevYear, prevMonth, day), isCurrentMonth: false }
  })

  const currentMonthDays = Array.from({ length: daysInViewMonth }, (_, i) => {
    const day = i + 1
    return { day, iso: formatIsoDate(viewYear, viewMonth, day), isCurrentMonth: true }
  })

  const filledCount = prevMonthDays.length + currentMonthDays.length
  const nextMonthDaysCount = filledCount % 7 === 0 ? 0 : 7 - (filledCount % 7)
  const nextMonthDays = Array.from({ length: nextMonthDaysCount }, (_, i) => {
    const day = i + 1
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
    return { day, iso: formatIsoDate(nextYear, nextMonth, day), isCurrentMonth: false }
  })

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]

  const isDateDisabled = (iso: string) => {
    if (minDate && iso < minDate) return true
    if (maxDate && iso > maxDate) return true
    return false
  }

  const years = React.useMemo(() => {
    const current = today.getFullYear()
    const list: number[] = []
    for (let y = current - 50; y <= current + 30; y++) list.push(y)
    return list
  }, [today])

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-1 border-b border-border/60 pb-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === "months" ? "days" : "months"))}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2",
              viewMode === "months" && "bg-primary-soft font-bold text-primary",
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
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2",
              viewMode === "years" && "bg-primary-soft font-bold text-primary",
            )}
            title="Choose year"
          >
            <span>{viewYear}</span>
            <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", viewMode === "years" && "rotate-180")} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus:outline-none"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus:outline-none"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

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
                  "rounded-lg py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-2",
                  isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary-hover",
                )}
              >
                {name.slice(0, 3)}
              </button>
            )
          })}
        </div>
      )}

      {viewMode === "years" && (
        <div className="grid max-h-[190px] grid-cols-4 gap-1.5 overflow-y-auto py-2 pr-1">
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
                  "rounded-lg py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2",
                  isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary-hover",
                )}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}

      {viewMode === "days" && (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="select-none py-0.5 text-[11px] font-semibold text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center" role="grid">
            {allDays.map((cell) => {
              const isSelected = cell.iso === selectedDate
              const isToday = cell.iso === todayIso
              const disabledDay = isDateDisabled(cell.iso)

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => onSelectDate(cell.iso)}
                  className={cn(
                    "mx-auto flex h-8 w-8 select-none items-center justify-center rounded-lg text-xs font-medium transition-all",
                    !cell.isCurrentMonth && "text-muted-foreground/40",
                    cell.isCurrentMonth && "text-foreground",
                    !isSelected && !disabledDay && "hover:bg-primary-soft hover:text-primary",
                    isToday && !isSelected && "border border-primary font-bold text-primary",
                    isSelected && "bg-primary font-bold text-primary-foreground shadow-xs hover:bg-primary-hover",
                    disabledDay && "cursor-not-allowed opacity-25 hover:bg-transparent",
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
    </>
  )
}

interface TimeColumnsProps {
  selectedHour: number
  selectedMinute: number
  onSelectHour: (hour: number) => void
  onSelectMinute: (minute: number) => void
  open: boolean
}

function TimeColumns({ selectedHour, selectedMinute, onSelectHour, onSelectMinute, open }: TimeColumnsProps) {
  const hourListRef = React.useRef<HTMLDivElement>(null)
  const minuteListRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      hourListRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" })
      minuteListRef.current?.querySelector<HTMLElement>("[data-selected='true']")?.scrollIntoView({ block: "center" })
    }, 10)
    return () => window.clearTimeout(t)
  }, [open])

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div>
        <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">Hour</p>
        <div ref={hourListRef} className="max-h-[188px] space-y-0.5 overflow-y-auto pr-1" role="listbox" aria-label="Hour">
          {HOURS_24.map((h) => {
            const on = h === selectedHour
            return (
              <button
                key={h}
                type="button"
                role="option"
                aria-selected={on}
                data-selected={on}
                onClick={() => onSelectHour(h)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1 text-xs tabular-nums transition-colors",
                  on ? "bg-primary font-semibold text-primary-foreground" : "text-foreground hover:bg-surface-2",
                )}
              >
                <span>{padZero(h)}</span>
                <span className={cn("text-[10px]", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{formatHourShort(h)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">Min</p>
        <div ref={minuteListRef} className="max-h-[188px] space-y-0.5 overflow-y-auto pr-1" role="listbox" aria-label="Minute">
          {MINUTES_60.map((m) => {
            const on = m === selectedMinute
            return (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={on}
                data-selected={on}
                onClick={() => onSelectMinute(m)}
                className={cn(
                  "flex w-full items-center justify-center rounded-md px-2 py-1 text-xs tabular-nums transition-colors",
                  on ? "bg-primary font-semibold text-primary-foreground" : "text-foreground hover:bg-surface-2",
                )}
              >
                :{padZero(m)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
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
    ref,
  ) => {
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = React.useState<string>(defaultValue || "")
    const currentValue = isControlled ? controlledValue || "" : internalValue
    const [open, setOpen] = React.useState(false)

    const todayIso = React.useMemo(() => localNowDateTime().date, [])
    const todayDisabled = Boolean((min && todayIso < min) || (max && todayIso > max))

    const handleSelectDate = (isoString: string) => {
      if (!isControlled) setInternalValue(isoString)
      onChange?.(isoString)
      setOpen(false)
    }

    const handleClear = (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation()
      if (!isControlled) setInternalValue("")
      onChange?.("")
      setOpen(false)
    }

    const handleGoToToday = () => {
      if (todayDisabled) return
      handleSelectDate(todayIso)
    }

    return (
      <div className={cn("relative inline-block w-full", className)}>
        {name && <input type="hidden" name={name} value={currentValue} required={required} disabled={disabled} />}

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
                "flex h-9 w-full select-none items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-all",
                !currentValue && "text-subtle-foreground",
                disabled && "pointer-events-none cursor-not-allowed opacity-50",
                triggerClassName,
              )}
            >
              <span className="truncate">{currentValue ? formatDateDisplay(currentValue) : placeholder}</span>
              <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                {clearable && currentValue && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleClear(e)
                      }
                    }}
                    className="rounded-sm p-0.5 transition-colors hover:bg-surface-2 hover:text-foreground focus:outline-none"
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
              collisionPadding={12}
              className={cn(floatingClasses, "z-50 w-[290px] rounded-xl border border-border/80 bg-surface p-3 shadow-xl")}
            >
              <CalendarGrid
                selectedDate={currentValue}
                minDate={min}
                maxDate={max}
                open={open}
                onSelectDate={handleSelectDate}
              />

              <div className="mt-2.5 flex items-center justify-between border-t border-border/60 px-0.5 pt-2.5">
                {clearable ? (
                  <button
                    type="button"
                    onClick={() => handleClear()}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline focus:outline-none"
                  >
                    Clear
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={todayDisabled}
                  onClick={handleGoToToday}
                  className={cn(
                    "text-xs font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus:outline-none",
                    todayDisabled && "cursor-not-allowed opacity-40 hover:no-underline",
                  )}
                >
                  Today
                </button>
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    )
  },
)
DatePicker.displayName = "DatePicker"

const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = "Select time...",
      disabled = false,
      className,
      triggerClassName,
      id,
      name,
      required,
      clearable = true,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = React.useState<string>(defaultValue || "")
    const currentValue = isControlled ? controlledValue || "" : internalValue
    const [open, setOpen] = React.useState(false)

    const parsed = parseTime(currentValue) ?? { hour: 9, minute: 0 }

    const commit = (next: string) => {
      if (!isControlled) setInternalValue(next)
      onChange?.(next)
    }

    const handleClear = (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation()
      commit("")
      setOpen(false)
    }

    return (
      <div className={cn("relative inline-block w-full", className)}>
        {name && <input type="hidden" name={name} value={currentValue} required={required} disabled={disabled} />}

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
                "flex h-9 w-full select-none items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-all",
                !currentValue && "text-subtle-foreground",
                disabled && "pointer-events-none cursor-not-allowed opacity-50",
                triggerClassName,
              )}
            >
              <span className="truncate tabular-nums">{currentValue ? formatTimeDisplay(currentValue) : placeholder}</span>
              <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                {clearable && currentValue && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleClear(e)
                      }
                    }}
                    className="rounded-sm p-0.5 transition-colors hover:bg-surface-2 hover:text-foreground focus:outline-none"
                    title="Clear time"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className={cn(floatingClasses, "z-50 w-[240px] rounded-xl border border-border/80 bg-surface p-3 shadow-xl")}
            >
              <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {currentValue ? formatTimeDisplay(currentValue) : "Choose time"}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {currentValue || "--:--"}
                </span>
              </div>

              <div className="mb-2.5 flex flex-wrap gap-1">
                {QUICK_TIMES.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      commit(preset.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      currentValue === preset.value
                        ? "border-primary bg-primary-soft text-primary-text"
                        : "border-border bg-surface-2/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <TimeColumns
                selectedHour={parsed.hour}
                selectedMinute={parsed.minute}
                open={open}
                onSelectHour={(h) => commit(`${padZero(h)}:${padZero(parsed.minute)}`)}
                onSelectMinute={(m) => commit(`${padZero(parsed.hour)}:${padZero(m)}`)}
              />

              <div className="mt-2.5 flex items-center justify-between border-t border-border/60 px-0.5 pt-2">
                {clearable ? (
                  <button
                    type="button"
                    onClick={() => handleClear()}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline focus:outline-none"
                  >
                    Clear
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => commit(localNowDateTime().time)}
                    className="text-xs font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus:outline-none"
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    )
  },
)
TimePicker.displayName = "TimePicker"

const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      min,
      max,
      placeholder = "Select date & time...",
      disabled = false,
      className,
      triggerClassName,
      id,
      name,
      required,
      clearable = true,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = React.useState<string>(defaultValue || "")
    const currentValue = isControlled ? controlledValue || "" : internalValue
    const [open, setOpen] = React.useState(false)

    const { date: currentDate, time: currentTime } = splitDateTime(currentValue)
    const minDate = min ? min.slice(0, 10) : undefined
    const maxDate = max ? max.slice(0, 10) : undefined
    const parsedTime = parseTime(currentTime) ?? { hour: 9, minute: 0 }

    const commit = (nextDate: string, nextTime: string) => {
      const next = nextDate ? `${nextDate}T${nextTime}` : ""
      if (!isControlled) setInternalValue(next)
      onChange?.(next)
    }

    const handleClear = (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation()
      commit("", "")
      setOpen(false)
    }

    const now = localNowDateTime()
    const nowDisabled = Boolean((minDate && now.date < minDate) || (maxDate && now.date > maxDate))

    const handlePickDay = (isoDate: string) => {
      const timeStr = currentTime || `${padZero(parsedTime.hour)}:${padZero(parsedTime.minute)}`
      commit(isoDate, timeStr)
    }

    const handlePickHour = (hour: number) => {
      const targetDate = currentDate || (nowDisabled && minDate ? minDate : now.date)
      commit(targetDate, `${padZero(hour)}:${padZero(parsedTime.minute)}`)
    }

    const handlePickMinute = (minute: number) => {
      const targetDate = currentDate || (nowDisabled && minDate ? minDate : now.date)
      commit(targetDate, `${padZero(parsedTime.hour)}:${padZero(minute)}`)
    }

    return (
      <div className={cn("relative inline-block w-full", className)}>
        {name && <input type="hidden" name={name} value={currentValue} required={required} disabled={disabled} />}

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
                "flex h-9 w-full select-none items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-all",
                !currentValue && "text-subtle-foreground",
                disabled && "pointer-events-none cursor-not-allowed opacity-50",
                triggerClassName,
              )}
            >
              <span className="truncate tabular-nums">{currentValue ? formatDateTimeDisplay(currentValue) : placeholder}</span>
              <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                {clearable && currentValue && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleClear(e)
                      }
                    }}
                    className="rounded-sm p-0.5 transition-colors hover:bg-surface-2 hover:text-foreground focus:outline-none"
                    title="Clear date and time"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className={cn(floatingClasses, "z-50 w-[290px] rounded-xl border border-border/80 bg-surface p-3 shadow-xl sm:w-[450px]")}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 min-w-0">
                  <CalendarGrid
                    selectedDate={currentDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    open={open}
                    onSelectDate={handlePickDay}
                  />
                </div>

                <div className="border-t border-border/60 pt-2.5 sm:w-[155px] sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                  <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-semibold text-foreground">Time</span>
                    <span className="text-[11px] font-medium tabular-nums text-primary-text">
                      {formatTimeDisplay(`${padZero(parsedTime.hour)}:${padZero(parsedTime.minute)}`)}
                    </span>
                  </div>
                  <TimeColumns
                    selectedHour={parsedTime.hour}
                    selectedMinute={parsedTime.minute}
                    open={open}
                    onSelectHour={handlePickHour}
                    onSelectMinute={handlePickMinute}
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-border/60 px-0.5 pt-2.5">
                {clearable ? (
                  <button
                    type="button"
                    onClick={() => handleClear()}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline focus:outline-none"
                  >
                    Clear
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={nowDisabled}
                    onClick={() => {
                      const current = localNowDateTime()
                      commit(current.date, current.time)
                    }}
                    className={cn(
                      "text-xs font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus:outline-none",
                      nowDisabled && "cursor-not-allowed opacity-40 hover:no-underline",
                    )}
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none"
                  >
                    Done
                  </button>
                </div>
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    )
  },
)
DateTimePicker.displayName = "DateTimePicker"

export { DatePicker, DateTimePicker, TimePicker }
export default DatePicker

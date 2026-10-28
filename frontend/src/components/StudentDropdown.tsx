import React, { useState, useRef, useEffect, useId } from "react"

export interface DropdownOption<T = string | number> {
  value: T
  label: string
  disabled?: boolean
  icon?: string | React.ReactNode
  description?: string
}

export interface StudentDropdownProps<T = string | number> {
  value: T
  onChange: (value: T) => void
  options: (DropdownOption<T> | string | number)[]
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  menuClassName?: string
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  id?: string
  name?: string
  error?: boolean
  errorText?: string
  required?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  align?: "left" | "right"
  rounded?: "xl" | "full" | "lg"
}

export function StudentDropdown<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  size = "md",
  fullWidth = true,
  id,
  name,
  error = false,
  errorText,
  required = false,
  searchable,
  searchPlaceholder = "Search options...",
  align = "left",
  rounded = "xl",
}: StudentDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [openUpward, setOpenUpward] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const dropdownId = id || generatedId

  // Normalize options into DropdownOption<T> objects
  const normalizedOptions: DropdownOption<T>[] = options.map((opt) => {
    if (typeof opt === "object" && opt !== null && "value" in opt) {
      return opt as DropdownOption<T>
    }
    return {
      value: opt as T,
      label: String(opt),
    }
  })

  // Filter options if searchable
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true
    return (
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opt.description &&
        opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  // Determine selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value)

  // Auto-enable search if option list is large and searchable not explicitly false
  const shouldShowSearch =
    searchable !== undefined ? searchable : normalizedOptions.length > 8

  // Check viewport position when opening to prevent menu clipping
  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const estimatedMenuHeight = Math.min(260, normalizedOptions.length * 40 + 60)

    if (spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight) {
      setOpenUpward(true)
    } else {
      setOpenUpward(false)
    }

    // Set initial highlighted index to selected item
    const selectedIdx = filteredOptions.findIndex((opt) => opt.value === value)
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0)

    // Focus search input if searchable
    if (shouldShowSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("touchstart", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("touchstart", handleOutsideClick)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case "Enter":
      case " ":
        if (!isOpen) {
          e.preventDefault()
          setIsOpen(true)
        } else if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          e.preventDefault()
          const opt = filteredOptions[highlightedIndex]
          if (!opt.disabled) {
            onChange(opt.value)
            setIsOpen(false)
            setSearchQuery("")
            triggerRef.current?.focus()
          }
        }
        break
      case "ArrowDown":
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => {
            const next = prev + 1
            return next >= filteredOptions.length ? 0 : next
          })
        }
        break
      case "ArrowUp":
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => {
            const next = prev - 1
            return next < 0 ? filteredOptions.length - 1 : next
          })
        }
        break
      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery("")
        triggerRef.current?.focus()
        break
      case "Tab":
        if (isOpen) {
          setIsOpen(false)
          setSearchQuery("")
        }
        break
    }
  }

  // Size styling tokens
  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-9.5 px-3.5 text-xs",
    lg: "h-11 px-4 text-sm",
  }[size]

  // Rounded classes
  const roundedClasses = {
    xl: "rounded-xl",
    full: "rounded-full",
    lg: "rounded-lg",
  }[rounded]

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native select for native forms / accessibility */}
      <select
        id={dropdownId}
        name={name}
        value={String(value)}
        onChange={(e) => onChange(e.target.value as unknown as T)}
        required={required}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {normalizedOptions.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={`${dropdownId}-button`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${dropdownId}-menu`}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen)
        }}
        className={`group flex items-center justify-between gap-2.5 w-full bg-white border font-semibold transition-all duration-150 cursor-pointer select-none ${sizeClasses} ${roundedClasses} ${
          error
            ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            : isOpen
              ? "border-[#905FEB] ring-2 ring-[#905FEB]/20 text-[#171526] shadow-sm"
              : "border-zinc-200/90 hover:border-[#905FEB] hover:bg-[#F0EDFF]/20 text-[#171526]"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100 hover:border-zinc-200" : ""} ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate text-left">
          {selectedOption?.icon && (
            <span className="shrink-0 text-zinc-500">{selectedOption.icon}</span>
          )}
          {selectedOption ? (
            <span className="text-[#171526] font-semibold truncate">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-zinc-400 font-normal truncate">
              {placeholder}
            </span>
          )}
        </span>

        {/* Clean right-aligned dropdown arrow with smooth rotation */}
        <span
          className={`shrink-0 transition-transform duration-200 ease-in-out ${
            isOpen ? "rotate-180 text-[#905FEB]" : "text-[#514B68] group-hover:text-[#905FEB]"
          }`}
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          id={`${dropdownId}-menu`}
          role="listbox"
          aria-labelledby={`${dropdownId}-button`}
          className={`absolute z-50 ${
            align === "right" ? "right-0" : "left-0"
          } ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } w-full min-w-[180px] bg-white rounded-2xl shadow-xl border border-zinc-200/90 p-1.5 overflow-hidden transition-all duration-150 transform origin-top animate-in fade-in zoom-in-95 ${menuClassName}`}
          style={{
            boxShadow: "0 12px 34px rgba(39, 28, 61, 0.12)",
          }}
        >
          {/* Optional Search filter */}
          {shouldShowSearch && (
            <div className="p-1.5 pb-2 border-b border-zinc-100 mb-1">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setHighlightedIndex(0)
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl bg-[#F1F0F3]/60 border border-zinc-200 focus:outline-none focus:border-[#905FEB] focus:bg-white text-zinc-900"
                />
                <span className="absolute left-2.5 top-2 text-zinc-400 text-xs pointer-events-none">
                  🔍
                </span>
              </div>
            </div>
          )}

          {/* Scrollable list */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 custom-dropdown-scroll">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-zinc-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value
                const isHighlighted = idx === highlightedIndex

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value)
                        setIsOpen(false)
                        setSearchQuery("")
                        triggerRef.current?.focus()
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed bg-transparent text-zinc-400"
                        : isSelected
                          ? "bg-[#F0E7FF] text-[#5F2BC0] font-bold"
                          : isHighlighted
                            ? "bg-[#F0EDFF]/80 text-[#5F2BC0]"
                            : "text-[#171526] hover:bg-[#F0EDFF]/70 hover:text-[#5F2BC0]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {/* Purple checkmark on selected item */}
                    {isSelected && (
                      <span className="text-[#905FEB] font-extrabold text-xs ml-auto shrink-0 animate-in fade-in">
                        ✓
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Error message text */}
      {errorText && (
        <span className="text-[11px] font-bold text-rose-500 mt-1 block">
          {errorText}
        </span>
      )}
    </div>
  )
}
export default StudentDropdown

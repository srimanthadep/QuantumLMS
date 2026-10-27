import React, { useState, useRef, useEffect, useId } from "react"

export const SUPPORT_TICKET_CATEGORIES = [
  "Login & Account",
  "Live Class",
  "Assignments & Exams",
  "Course Content",
  "Technical Problem",
  "Payments & Certificates",
  "Notifications",
  "Others",
] as const

export const SUPPORT_FILTER_CATEGORIES = [
  "All Categories",
  ...SUPPORT_TICKET_CATEGORIES,
] as const

export type SupportCategoryType =
  | (typeof SUPPORT_TICKET_CATEGORIES)[number]
  | "All Categories"
  | "Select Issue Category"
  | string

interface SupportCategoryDropdownProps {
  value: string
  onChange: (value: string) => void
  options?: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  error?: boolean
  errorText?: string
  fullWidth?: boolean
  rounded?: "xl" | "full"
  size?: "sm" | "md"
}

export function SupportCategoryDropdown({
  value,
  onChange,
  options = [...SUPPORT_TICKET_CATEGORIES],
  placeholder = "Select Category",
  disabled = false,
  className = "",
  triggerClassName = "",
  error = false,
  errorText,
  fullWidth = true,
  rounded = "xl",
  size = "md",
}: SupportCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  const isSelected = (opt: string) => {
    if (!value && opt === "Select Issue Category") return true
    if (value === "All" && opt === "All Categories") return true
    return value === opt
  }

  // Display label
  const displayLabel = () => {
    if (!value || value === "Select Issue Category" || value === "") {
      return placeholder
    }
    if (value === "All") return "All Categories"
    return value
  }

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("touchstart", handleOutsideClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("touchstart", handleOutsideClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  // Viewport detection
  useEffect(() => {
    if (!isOpen || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const estimatedHeight = options.length * 38 + 20
    if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
      setOpenUpward(true)
    } else {
      setOpenUpward(false)
    }
  }, [isOpen, options.length])

  const sizeClasses = size === "sm" ? "h-8.5 px-3.5 text-xs" : "h-10 px-3.5 text-xs"
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-xl"

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"} ${className}`}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={`cat-dropdown-${id}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen)
        }}
        className={`group flex items-center justify-between gap-2.5 w-full bg-white border font-semibold transition-all duration-150 cursor-pointer select-none ${sizeClasses} ${roundedClass} ${
          error
            ? "border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 ring-2 ring-rose-500/20"
            : isOpen
              ? "border-[#905FEB] ring-2 ring-[#905FEB]/20 text-[#171526] shadow-sm"
              : "border-zinc-200/90 hover:border-[#905FEB] text-[#171526]"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100" : ""} ${triggerClassName}`}
      >
        <span
          className={`truncate text-left ${
            !value || value === "Select Issue Category"
              ? "text-zinc-400 font-normal"
              : "text-[#171526] font-semibold"
          }`}
        >
          {displayLabel()}
        </span>

        {/* Clean right-aligned chevron with smooth rotation */}
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

      {/* Vertically Listed Selection Style Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={`cat-dropdown-${id}`}
          className={`absolute z-50 left-0 w-full min-w-[200px] bg-white rounded-2xl shadow-xl border border-zinc-200/80 p-1.5 transition-all duration-150 transform origin-top animate-in fade-in zoom-in-95 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{
            boxShadow: "0 12px 34px rgba(39, 28, 61, 0.12)",
          }}
        >
          <div className="max-h-64 overflow-y-auto space-y-0.5 custom-dropdown-scroll">
            {options.map((opt) => {
              const selected = isSelected(opt)
              return (
                <div
                  key={opt}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt)
                    setIsOpen(false)
                    triggerRef.current?.focus()
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                    selected
                      ? "bg-[#F0E7FF] text-[#5F2BC0] font-bold"
                      : "text-[#171526] hover:bg-[#F0EDFF]/70 hover:text-[#5F2BC0]"
                  }`}
                >
                  <span className="truncate">{opt}</span>

                  {/* Purple checkmark on selected option */}
                  {selected && (
                    <span className="text-[#905FEB] font-extrabold text-sm ml-auto shrink-0 animate-in fade-in">
                      ✓
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {errorText && (
        <span className="text-[11px] font-bold text-rose-500 mt-1 block">
          {errorText}
        </span>
      )}
    </div>
  )
}

export default SupportCategoryDropdown

import type { IconName } from "../types"

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-1.2c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3V19M16 5.5a3 3 0 0 1 0 5.8M17 13c2.2.5 3.5 2.2 3.5 4.8V19" />
      </svg>
    )
  }
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4m8-4v4M8 12l2.2 2.2L15 10" />
      </svg>
    )
  }
  if (name === "document" || name === "reports") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4V20H7z" />
        <path d="M14 3.5V8h4M10 12h5m-5 3h5" />
      </svg>
    )
  }
  if (name === "trend") {
    return (
      <svg {...common}>
        <path d="m5 16 4.5-4.5 3 3L19 8" />
        <path d="M14 8h5v5" />
      </svg>
    )
  }
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m4 11 8-7 8 7v8H4z" />
      </svg>
    )
  }
  if (name === "analytics") {
    return (
      <svg {...common}>
        <path d="M5 20V10h4v10m2 0V4h4v16m2 0v-7h4v7z" />
      </svg>
    )
  }
  if (name === "settings") {
    return (
      <svg {...common}>
        <path d="m12 3 7 4v10l-7 4-7-4V7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    )
  }
  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 5.5c3.2-.8 5.8.1 8 2.1v12c-2.2-2-4.8-2.9-8-2.1zm16 0c-3.2-.8-5.8.1-8 2.1v12c2.2-2 4.8-2.9 8-2.1z" />
      </svg>
    )
  }
  if (name === "chart") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v8l6.5 4.5M12 12H4" />
      </svg>
    )
  }
  if (name === "ruler") {
    return (
      <svg {...common}>
        <rect
          x="5"
          y="7"
          width="14"
          height="10"
          rx="2"
          transform="rotate(-42 12 12)"
        />
        <path d="m9.5 9.5 2 2m.5-5 2 2m-7.5 5 2 2" />
      </svg>
    )
  }
  if (name === "dots") {
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r=".9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r=".9" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    )
  }
  if (name === "close") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    )
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }
  if (name === "sparkles" || name === "star") {
    return (
      <svg {...common}>
        <path d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
      </svg>
    )
  }
  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <polyline points="3 7 12 13 21 7" />
      </svg>
    )
  }
  if (name === "filter") {
    return (
      <svg {...common}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    )
  }
  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    )
  }
  if (name === "compass") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" fill="currentColor" fillOpacity="0.2" />
      </svg>
    )
  }
  if (name === "radio") {
    return (
      <svg {...common}>
        <path d="M4.93 4.93a10 10 0 0 0 0 14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 7.76a6 6 0 0 0 0 8.48M16.24 7.76a6 6 0 0 1 0 8.48" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    )
  }
  if (name === "note") {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  }
  if (name === "award") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="6" />
        <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
      </svg>
    )
  }
  if (name === "help") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r=".75" fill="currentColor" />
      </svg>
    )
  }
  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    )
  }
  if (name === "fire") {
    return (
      <svg {...common}>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    )
  }
  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 6 12 12 15 15" />
      </svg>
    )
  }
  if (name === "bookmark") {
    return (
      <svg {...common}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  if (name === "play") {
    return (
      <svg {...common}>
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === "chevron-right") {
    return (
      <svg {...common}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    )
  }
  return null
}

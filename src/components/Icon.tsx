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
          transform="rotate(45 12 12)"
        />
        <path d="m9.5 7.5 1.5 1.5m1 1 1.5 1.5m1 1 1.5 1.5" />
      </svg>
    )
  }
  if (name === "dots") {
    return (
      <svg {...common}>
        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
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
  if (name === "activity") {
    return (
      <svg {...common}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
  if (name === "chevron-left") {
    return (
      <svg {...common}>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    )
  }
  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  }
  if (name === "list") {
    return (
      <svg {...common}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth={2.8} />
        <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={2.8} />
        <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={2.8} />
      </svg>
    )
  }
  if (name === "message-circle") {
    return (
      <svg {...common}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    )
  }
  if (name === "video") {
    return (
      <svg {...common}>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    )
  }
  if (name === "mic") {
    return (
      <svg {...common}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    )
  }
  if (name === "mic-off") {
    return (
      <svg {...common}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    )
  }
  if (name === "video-off") {
    return (
      <svg {...common}>
        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  if (name === "monitor") {
    return (
      <svg {...common}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }
  if (name === "phone-off") {
    return (
      <svg {...common}>
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
        <line x1="23" y1="1" x2="1" y2="23" />
      </svg>
    )
  }
  if (name === "info") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  }
  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    )
  }
  if (name === "tag") {
    return (
      <svg {...common}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    )
  }
  if (name === "pause") {
    return (
      <svg {...common}>
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    )
  }
  if (name === "maximize") {
    return (
      <svg {...common}>
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    )
  }
  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    )
  }
  if (name === "check-circle") {
    return (
      <svg {...common}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  }
  if (name === "server") {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    )
  }
  if (name === "key") {
    return (
      <svg {...common}>
        <path d="M21 2l-2 2m-1.5 1.5L14 9l-2-2-4 4 1.5 1.5L8 14l-2 2 4 4 2-2 1.5 1.5 4-4-2-2 3.5-3.5L21 2z" />
      </svg>
    )
  }
  if (name === "cpu") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3" />
      </svg>
    )
  }
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  }
  if (name === "database") {
    return (
      <svg {...common}>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    )
  }
  if (name === "terminal") {
    return (
      <svg {...common}>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    )
  }
  if (name === "layers") {
    return (
      <svg {...common}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    )
  }
  return null
}

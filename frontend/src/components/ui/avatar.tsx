import * as React from "react"
import { cn } from "@/lib/utils"

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"
type AvatarStatus = "online" | "away" | "busy" | "offline"

const SIZES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
}
const STATUS: Record<AvatarStatus, string> = {
  online: "bg-success",
  away: "bg-warning",
  busy: "bg-danger",
  offline: "bg-subtle-foreground",
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null
  name: string
  size?: AvatarSize
  status?: AvatarStatus
  /** Square-ish corners instead of a circle. */
  rounded?: "full" | "md"
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

/** Image avatar with an initials fallback (also used when the image fails) and optional status dot. */
function Avatar({ src, name, size = "md", status, rounded = "full", className, ...props }: AvatarProps) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [src])
  const shape = rounded === "full" ? "rounded-full" : "rounded-md"
  return (
    <span className={cn("relative inline-flex shrink-0", SIZES[size], className)} {...props}>
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-cover ring-1 ring-border", shape)}
        />
      ) : (
        <span
          role="img"
          aria-label={name}
          className={cn(
            "flex h-full w-full items-center justify-center bg-primary-soft font-semibold text-primary-text ring-1 ring-primary-border",
            shape,
          )}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-surface",
            STATUS[status],
            size === "xs" && "h-1.5 w-1.5 ring-1",
          )}
        >
          <span className="sr-only">{status}</span>
        </span>
      )}
    </span>
  )
}

export { Avatar }
export default Avatar

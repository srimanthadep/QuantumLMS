import { useId, useState, type ReactNode } from "react"
import { Bot, Brain, Code2, Eye, MessageSquareText, Network, Server, Sparkles, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** AI course categories (mirrors the domain model). */
export type CourseCategoryName =
  | "Generative AI"
  | "LLM Engineering"
  | "Agentic Systems"
  | "Machine Learning"
  | "Computer Vision"
  | "MLOps"
  | "Prompt Engineering"
  | "Python for AI"

const ART: Record<CourseCategoryName, { icon: LucideIcon; from: string; to: string; accent: string }> = {
  "Generative AI": { icon: Sparkles, from: "#2a1b6b", to: "#0b0a1f", accent: "#8b7cff" },
  "LLM Engineering": { icon: MessageSquareText, from: "#132a5e", to: "#070b1a", accent: "#60a5fa" },
  "Agentic Systems": { icon: Bot, from: "#0f3b3a", to: "#06110f", accent: "#34d399" },
  "Machine Learning": { icon: Brain, from: "#3b1d4f", to: "#0e0712", accent: "#e879f9" },
  "Computer Vision": { icon: Eye, from: "#0e3446", to: "#050d12", accent: "#22d3ee" },
  MLOps: { icon: Server, from: "#3a2a10", to: "#100b04", accent: "#fbbf24" },
  "Prompt Engineering": { icon: Network, from: "#3f1530", to: "#12060d", accent: "#fb7185" },
  "Python for AI": { icon: Code2, from: "#1d3a1a", to: "#081107", accent: "#a3e635" },
}

interface CourseCoverProps {
  title: string
  category?: CourseCategoryName | string
  image?: string | null
  className?: string
  /** Overlay content (badges, progress) positioned by the caller. */
  children?: ReactNode
  /** Show the title on generated art. */
  showTitle?: boolean
  /** Subtle zoom on parent hover (`group` class required on an ancestor). */
  hoverZoom?: boolean
}

/**
 * Course artwork: the course image with a bottom gradient scrim, or (when there
 * is no image or it fails to load) generated gradient art with the category icon.
 * Always dark, so overlay text can be white in both themes.
 */
export default function CourseCover({ title, category, image, className, children, showTitle = true, hoverZoom = true }: CourseCoverProps) {
  const [failed, setFailed] = useState(false)
  const patternId = `cc-grid-${useId().replace(/:/g, "")}`
  const art = ART[(category as CourseCategoryName) ?? "Generative AI"] ?? ART["Generative AI"]
  const Icon = art.icon
  const useImage = image && !failed
  return (
    <div className={cn("relative isolate aspect-video w-full overflow-hidden bg-ink-950", className)}>
      {useImage ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            hoverZoom && "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]",
          )}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0",
            hoverZoom && "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]",
          )}
          style={{ background: `radial-gradient(120% 90% at 85% 10%, ${art.accent}55 0%, transparent 55%), linear-gradient(140deg, ${art.from} 0%, ${art.to} 100%)` }}
        >
          <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden="true">
            <defs>
              <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
          <Icon className="absolute -bottom-4 -right-3 h-28 w-28 opacity-25" style={{ color: art.accent }} strokeWidth={1.25} />
          {showTitle && (
            <div className="absolute inset-x-4 top-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 backdrop-blur" style={{ color: art.accent }}>
                <Icon className="h-4 w-4" />
              </span>
              {category && <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">{category}</span>}
            </div>
          )}
          {showTitle && <p className="absolute inset-x-4 bottom-4 line-clamp-2 text-base font-semibold leading-snug text-white">{title}</p>}
        </div>
      )}
      {useImage && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />}
      {children}
    </div>
  )
}

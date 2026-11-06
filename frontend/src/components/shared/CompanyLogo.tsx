import { useState, memo } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCompanyBrand, getCompanyLogoUrl } from "@/lib/companyLogos"

export interface CompanyLogoProps {
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "badge" | "plain"
  showName?: boolean
  nameClassName?: string
  className?: string
  containerClassName?: string
}

const SIZE_MAP = {
  xs: { box: "h-5 w-auto max-w-[40px]", img: "h-3.5 w-auto max-w-[40px]", text: "text-[11px]" },
  sm: { box: "h-6 w-auto max-w-[56px]", img: "h-4.5 w-auto max-w-[56px]", text: "text-xs" },
  md: { box: "h-7 w-auto max-w-[68px]", img: "h-5.5 w-auto max-w-[68px]", text: "text-sm" },
  lg: { box: "h-9 w-auto max-w-[80px]", img: "h-7 w-auto max-w-[80px]", text: "text-base" },
  xl: { box: "h-11 w-auto max-w-[96px]", img: "h-9 w-auto max-w-[96px]", text: "text-lg" },
} as const

function CompanyLogoComponent({
  name,
  size = "sm",
  variant = "plain",
  showName = false,
  nameClassName,
  className,
  containerClassName,
}: CompanyLogoProps) {
  const [error, setError] = useState(false)
  const brand = getCompanyBrand(name)
  const logoUrl = brand?.logo ?? getCompanyLogoUrl(name)
  const dimensions = SIZE_MAP[size]
  const isDarkMonoBrand = brand?.color === "#111" || brand?.color === "#111111"
  const isBadge = variant === "badge"

  const logoNode = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors",
        isBadge
          ? "rounded-md border border-border/60 bg-white p-1 shadow-2xs dark:border-border/80 dark:bg-white/95"
          : "bg-transparent border-0 shadow-none p-0",
        dimensions.box,
        className
      )}
      title={brand?.name ?? name}
      aria-label={`${brand?.name ?? name} logo`}
    >
      {!error ? (
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          onError={() => setError(true)}
          className={cn(
            "h-full w-auto max-w-full object-contain select-none",
            dimensions.img,
            isDarkMonoBrand && "dark:brightness-0 dark:invert"
          )}
          loading="lazy"
        />
      ) : (
        <Building2 className={cn("text-muted-foreground", dimensions.img)} aria-hidden="true" />
      )}
    </span>
  )

  if (!showName) {
    return logoNode
  }

  const brandColor = brand?.color && !isDarkMonoBrand ? brand.color : undefined

  return (
    <div className={cn("inline-flex items-center gap-1.5 min-w-0", containerClassName)}>
      {logoNode}
      <span
        className={cn("truncate font-bold tracking-tight", dimensions.text, nameClassName)}
        style={{ color: brandColor }}
      >
        {brand?.name ?? name}
      </span>
    </div>
  )
}

export default memo(CompanyLogoComponent)

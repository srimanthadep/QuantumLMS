import { useState, memo } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCompanyBrand, getCompanyLogoUrl } from "@/lib/companyLogos"

export interface CompanyLogoProps {
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  showName?: boolean
  nameClassName?: string
  className?: string
  containerClassName?: string
}

const SIZE_MAP = {
  xs: { box: "h-5 w-5", img: "h-3.5 w-3.5", text: "text-[11px]" },
  sm: { box: "h-6 w-6", img: "h-4 w-4", text: "text-xs" },
  md: { box: "h-8 w-8", img: "h-5 w-5", text: "text-sm" },
  lg: { box: "h-10 w-10", img: "h-6 w-6", text: "text-base" },
  xl: { box: "h-12 w-12", img: "h-8 w-8", text: "text-lg" },
} as const

function CompanyLogoComponent({
  name,
  size = "sm",
  showName = false,
  nameClassName,
  className,
  containerClassName,
}: CompanyLogoProps) {
  const [error, setError] = useState(false)
  const brand = getCompanyBrand(name)
  const logoUrl = brand?.logo ?? getCompanyLogoUrl(name)
  const dimensions = SIZE_MAP[size]

  const logoNode = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-white p-1 shadow-2xs transition-colors dark:border-border/80 dark:bg-white/95",
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
          className={cn("h-full w-full object-contain select-none", dimensions.img)}
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

  const brandColor = brand?.color && brand.color !== "#111" && brand.color !== "#111111"
    ? brand.color
    : undefined

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

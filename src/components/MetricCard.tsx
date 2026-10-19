import { useState, useEffect, useRef } from "react"
import type { MetricItem } from "../types"
import { Icon } from "./Icon"

export function FolderTabBackground({
  width,
  height,
}: {
  width: number
  height: number
  label?: string
}) {
  const w = Math.max(width, 100)
  const h = Math.max(height, 80)
  const rTop = 22
  const rOther = 22
  const tabHeight = 11
  const dx = 18

  // Tab covers approximately 50% of card width, leaving room for the drop & lower deck
  const cutX = Math.min(Math.max(Math.round(w * 0.50), 160), w - 42)
  const endCutX = cutX + dx

  const pathD = [
    `M ${rTop} 0`,
    `L ${cutX} 0`,
    `C ${cutX + dx * 0.45} 0, ${cutX + dx * 0.55} ${tabHeight}, ${endCutX} ${tabHeight}`,
    `L ${w - rOther} ${tabHeight}`,
    `A ${rOther} ${rOther} 0 0 1 ${w} ${tabHeight + rOther}`,
    `L ${w} ${h - rOther}`,
    `A ${rOther} ${rOther} 0 0 1 ${w - rOther} ${h}`,
    `L ${rOther} ${h}`,
    `A ${rOther} ${rOther} 0 0 1 0 ${h - rOther}`,
    `L 0 ${rTop}`,
    `A ${rTop} ${rTop} 0 0 1 ${rTop} 0`,
    `Z`,
  ].join(" ")

  return (
    <svg
      className="folder-tab-svg"
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <path d={pathD} fill="#ffffff" />
    </svg>
  )
}

export function MetricCard({ item }: { item: MetricItem }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 210, height: 132 })

  useEffect(() => {
    if (!containerRef.current) return
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          })
        }
      }
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={containerRef}
      className="metric-card folder-tab-card"
      aria-label={item.label}
    >
      <FolderTabBackground
        width={dimensions.width}
        height={dimensions.height}
        label={item.label}
      />
      <div className={`metric-icon ${item.tone}`}>
        <Icon name={item.icon} size={19} />
      </div>
      <div className="metric-label">{item.label}</div>
      <div className="metric-bottom">
        <strong>{item.value}</strong>
        <span>{item.trend}</span>
      </div>
    </section>
  )
}

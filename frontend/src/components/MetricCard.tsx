import type { MetricItem } from "../types"
import { Icon } from "./Icon"

export function FolderTabBackground(_props?: {
  width?: number
  height?: number
  label?: string
}) {
  return null
}

export function MetricCard({ item }: { item: MetricItem }) {
  return (
    <section className="metric-card" aria-label={item.label}>
      <div className="flex items-center justify-between gap-3">
        <span className="metric-label">{item.label}</span>
        <div className={`metric-icon ${item.tone}`}>
          <Icon name={item.icon} size={18} />
        </div>
      </div>
      <div className="metric-bottom mt-1">
        <strong>{item.value}</strong>
        {item.trend && <span>{item.trend}</span>}
      </div>
    </section>
  )
}

export default MetricCard

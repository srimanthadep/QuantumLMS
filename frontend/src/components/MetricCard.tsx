import type { MetricItem } from "../types"
import { Icon } from "./Icon"

export function FolderTabBackground() {
  return null
}

export function MetricCard({ item, onClick }: { item: MetricItem; onClick?: () => void }) {
  return (
    <section
      className={`metric-card ${onClick ? "cursor-pointer" : ""}`}
      aria-label={item.label}
      onClick={onClick}
    >
      <div className={`metric-icon ${item.tone}`}>
        <Icon name={item.icon} size={19} />
      </div>
      <div className="metric-label">{item.label}</div>
      <div className="metric-bottom">
        <strong>{item.value}</strong>
        {item.trend && <span>{item.trend}</span>}
      </div>
    </section>
  )
}

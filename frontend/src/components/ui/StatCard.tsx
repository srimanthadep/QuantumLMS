import React from "react";
import { cn } from "@/lib/utils";

export function FolderTabBackground() {
  return null;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  icon?: React.ElementType;
  tone?: "lavender" | "pink" | "yellow" | "lime";
  trend?:
  | {
    value: string;
    isPositive?: boolean;
  }
  | "up"
  | "down"
  | "neutral"
  | string;
  highlight?: boolean;
  index?: number;
  className?: string;
  onAction?: () => void;
  onClick?: () => void;
  isActive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  tone,
  trend,
  highlight = false,
  index = 0,
  className,
  onAction,
  onClick,
  isActive = false,
}) => {
  // Determine tone if not provided
  const resolvedTone: "lavender" | "pink" | "yellow" | "lime" =
    tone ||
    (index % 4 === 0
      ? "lavender"
      : index % 4 === 1
      ? "pink"
      : index % 4 === 2
      ? "yellow"
      : "lime");

  const trendText =
    typeof trend === "object"
      ? trend?.value
      : typeof trend === "string"
      ? trend
      : change || subtitle || "";

  return (
    <section
      onClick={onClick}
      className={cn(
        "metric-card",
        isActive && "ring-2 ring-[#F0442E] shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        transform: isActive ? "translateY(-2px)" : undefined,
      }}
      aria-label={title}
    >
      {Icon && (
        <div className={`metric-icon ${resolvedTone}`}>
          <Icon size={19} className="w-[19px] h-[19px]" />
        </div>
      )}
      <div className="metric-label">{title}</div>
      <div className="metric-bottom">
        <strong>{value}</strong>
        {trendText && <span>{trendText}</span>}
      </div>
    </section>
  );
};

export default StatCard;

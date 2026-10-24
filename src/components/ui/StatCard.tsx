import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function FolderTabBackground({
  width,
  height,
}: {
  width: number;
  height: number;
  label?: string;
}) {
  const w = Math.max(width, 100);
  const h = Math.max(height, 80);
  const rTop = 22;
  const rOther = 22;
  const tabHeight = 11;
  const dx = 18;

  // Tab covers approximately 50% of card width, leaving room for the drop & lower deck
  const cutX = Math.min(Math.max(Math.round(w * 0.50), 160), w - 42);
  const endCutX = cutX + dx;

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
  ].join(" ");

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
  );
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 210, height: 132 });

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
      ref={containerRef}
      onClick={onClick}
      className={cn(
        "metric-card folder-tab-card",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        filter: isActive
          ? "drop-shadow(0 0 0 2.5px #9860e9) drop-shadow(0 8px 16px rgba(152, 96, 233, 0.3))"
          : undefined,
        transform: isActive ? "translateY(-2px)" : undefined,
      }}
      aria-label={title}
    >
      <FolderTabBackground
        width={dimensions.width}
        height={dimensions.height}
        label={title}
      />
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

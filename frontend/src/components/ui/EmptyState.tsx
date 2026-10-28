import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileQuestion } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/15",
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
        {icon || <FileQuestion className="h-8 w-8 text-primary" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="text-xs h-9 gap-1.5 shadow-xs">
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

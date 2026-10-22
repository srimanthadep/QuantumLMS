import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

export const FloatingActionButton = ({
  onClick,
  className,
  icon,
  ariaLabel = "Action",
}: FloatingActionButtonProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn("fixed bottom-20 right-4 z-40 sm:hidden", className)}
    >
      <Button
        onClick={() => {
          if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
            try {
              navigator.vibrate(15);
            } catch {}
          }
          onClick();
        }}
        size="lg"
        aria-label={ariaLabel}
        className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center p-0 ring-4 ring-background/50"
      >
        {icon || <Plus className="h-6 w-6" />}
      </Button>
    </motion.div>
  );
};

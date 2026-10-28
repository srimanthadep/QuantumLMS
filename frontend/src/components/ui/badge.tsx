import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#172033] text-white hover:bg-[#172033]/90",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200/80",
        destructive:
          "border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        outline:
          "text-slate-700 border border-slate-200 bg-white",
        success:
          "border border-teal-600/20 bg-teal-50 text-[#0F766E] dark:bg-teal-950/50 dark:text-teal-300",
        warning:
          "border border-amber-500/25 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        info:
          "border border-sky-500/25 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
        accent:
          "border border-[#F0442E]/25 bg-[#FEF2F0] text-[#F0442E] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

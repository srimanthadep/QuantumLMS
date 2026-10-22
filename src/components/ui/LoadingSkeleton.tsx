import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted/70", className)}
      {...props}
    />
  );
};

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3 w-full">
    <div className="flex gap-4 p-3 bg-muted/40 rounded-xl">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-5 w-20 ml-auto" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3.5 border border-border/60 rounded-xl">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3">
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-xl" />
    </div>
    <Skeleton className="h-7 w-32" />
    <Skeleton className="h-3.5 w-20" />
  </div>
);

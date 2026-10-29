import { Skeleton, SkeletonText } from "@/components/ui/skeleton"

/** Suspense fallback shaped like the app shell (sidebar, top bar, KPI row, content). */
export default function RouteFallback({ variant = "app" }: { variant?: "app" | "page" }) {
  if (variant === "page") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-16" role="status" aria-label="Loading">
        <Skeleton className="h-8 w-1/3" />
        <SkeletonText lines={4} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-screen w-full bg-background" role="status" aria-label="Loading">
      <aside className="hidden w-[var(--shell-sidebar-w)] shrink-0 flex-col gap-3 border-r border-border bg-surface p-4 lg:flex">
        <Skeleton className="mb-4 h-8 w-32" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[var(--shell-topbar-h)] items-center gap-3 border-b border-border px-4 sm:px-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="ml-auto h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-6 p-4 sm:p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 lg:col-span-2" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

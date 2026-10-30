import { BotAvatar } from "bot-avatars"
import { Tooltip } from "@/components/ui/tooltip"

interface CloverAssistantButtonProps {
  onOpen: () => void
}

/**
 * One persistent assistant launcher. It stays above the viewport's lower-right
 * edge, independent of the current portal, scrolling state or sidebar mode.
 */
export default function CloverAssistantButton({ onOpen }: CloverAssistantButtonProps) {
  return (
    <Tooltip content="Open Clover assistant" side="left">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open Clover assistant"
        className="group fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-primary-border bg-surface/90 shadow-[var(--elev-lg)] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[var(--glow-primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <span aria-hidden="true" className="absolute inset-1 rounded-full bg-primary-soft" />
        <BotAvatar
          type="clover"
          face="mouth"
          state="default"
          size={56}
          shading="plastic"
          highlight={1.1}
          rim={0.7}
          turn={0.6}
          jumpEvery={0}
          interactive
          aria-hidden="true"
          className="relative"
        />
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
        <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface-3 px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-[var(--elev-md)] transition-[opacity,transform] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          Clover
        </span>
      </button>
    </Tooltip>
  )
}

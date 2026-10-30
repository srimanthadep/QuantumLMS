import { BotAvatar } from "bot-avatars"
import { Tooltip } from "@/components/ui/tooltip"

interface CloverAssistantButtonProps {
  onOpen: () => void
}

/**
 * One persistent assistant launcher: the Clover bot on its own, with no chip
 * behind it, fixed above the viewport's lower-right edge and independent of
 * the portal, scroll position or sidebar mode.
 */
export default function CloverAssistantButton({ onOpen }: CloverAssistantButtonProps) {
  return (
    <Tooltip content="Open Clover assistant" side="left">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open Clover assistant"
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 active:scale-95 sm:bottom-6 sm:right-6"
      >
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
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  )
}

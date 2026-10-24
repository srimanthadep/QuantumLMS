import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { key: "Ctrl + K / ⌘ + K", description: "Open Command Palette / Global Search" },
  { key: "?", description: "Open this Keyboard Shortcuts help sheet" },
  { key: "D", description: "Go to active role dashboard" },
  { key: "N", description: "Trigger quick contextual action (New class / doubt / ticket)" },
  { key: "Space / K", description: "Play / Pause lecture replay in player" },
  { key: "J / L", description: "Skip 10 seconds backward / forward in video player" },
  { key: "Esc", description: "Close any active modal, dialog, or drawer" },
];

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Power user hotkeys available throughout the LMS workstation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 mt-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20"
            >
              <span className="text-xs text-foreground font-medium">{s.description}</span>
              <kbd className="text-[11px] font-mono bg-card border border-border/80 px-2 py-0.5 rounded shadow-xs text-primary font-bold">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

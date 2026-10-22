import React, { useState } from "react";
import { THEME_ACCENTS, themeService, ThemeAccent } from "@/services/themeService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ThemeAccentPicker: React.FC = () => {
  const [activeAccent, setActiveAccent] = useState<ThemeAccent>(themeService.getActiveAccent());
  const [open, setOpen] = useState(false);

  const handleSelect = (accent: ThemeAccent) => {
    themeService.setAccent(accent.id);
    setActiveAccent(accent);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Theme accent color"
          className="h-9 w-9 rounded-xl border border-border/70 hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors relative focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span
            className="w-3.5 h-3.5 rounded-full ring-2 ring-background shadow-xs"
            style={{ backgroundColor: activeAccent.colorHex }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3 rounded-2xl border-border/80 shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-primary" />
            Accent Palette
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium">5 Themes</span>
        </div>
        <div className="space-y-1">
          {THEME_ACCENTS.map((accent) => {
            const isSelected = accent.id === activeAccent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => handleSelect(accent)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left",
                  isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/60 text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-1 ring-border shadow-xs shrink-0"
                    style={{ backgroundColor: accent.colorHex }}
                  />
                  <span>{accent.name}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

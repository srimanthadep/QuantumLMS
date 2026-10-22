import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, HelpCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoChapter } from "@/types/lms";
import { cn } from "@/lib/utils";

interface SmartVideoPlayerProps {
  title: string;
  durationSeconds: number; // e.g. 5325 (01:28:45)
  chapters: VideoChapter[];
  currentTime: number;
  onTimeUpdate: (seconds: number) => void;
  onOpenDoubtModal?: (seconds: number) => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  title,
  durationSeconds,
  chapters,
  currentTime,
  onTimeUpdate,
  onOpenDoubtModal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Time simulation ticker when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onTimeUpdate(Math.min(currentTime + 1 * playbackSpeed, durationSeconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, playbackSpeed, durationSeconds, onTimeUpdate]);

  const formatSeconds = (sec: number) => {
    const total = Math.floor(sec);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeUpdate(Number(e.target.value));
  };

  const skipSeconds = (delta: number) => {
    const next = Math.max(0, Math.min(currentTime + delta, durationSeconds));
    onTimeUpdate(next);
  };

  const currentChapter = [...chapters]
    .reverse()
    .find((ch) => currentTime >= ch.timestampSeconds) || chapters[0];

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden bg-black text-white shadow-xl border border-border/80 group select-none aspect-video flex flex-col justify-between"
    >
      {/* Video canvas simulator */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none z-10" />

      {/* Background visual art for video */}
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative z-0 opacity-40 max-w-md">
          <div className="h-28 w-28 rounded-full bg-primary/20 blur-2xl absolute inset-0 m-auto animate-pulse" />
          <div className="border border-white/20 rounded-xl p-4 bg-white/5 backdrop-blur-md">
            <p className="text-xs font-mono text-primary font-bold">LECTURE STREAM ACTIVE</p>
            <p className="text-sm font-semibold mt-1 text-slate-200">{title}</p>
            <p className="text-xs text-slate-400 mt-2 font-mono">
              Timestamp: {formatSeconds(currentTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="min-w-0 flex-1 mr-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 mr-2">
            AI Synchronized
          </span>
          <span className="text-xs sm:text-sm font-bold text-white truncate inline-block align-middle max-w-[70%]">
            {currentChapter ? currentChapter.title : title}
          </span>
        </div>

        {/* Timestamp Doubt trigger */}
        <Button
          size="sm"
          variant="glass"
          onClick={() => onOpenDoubtModal?.(currentTime)}
          className="h-8 text-xs font-bold text-white border-white/20 hover:bg-white/20 gap-1.5 shadow-md bg-white/10 shrink-0"
        >
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
          <span>Ask Doubt @ {formatSeconds(currentTime)}</span>
        </Button>
      </div>

      {/* Center Play Button Overlay */}
      <div className="relative z-20 self-center flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all ring-4 ring-white/20"
        >
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
        </button>
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-2">
        {/* Scrubber bar with chapter markers */}
        <div className="relative group/scrubber">
          <input
            type="range"
            min={0}
            max={durationSeconds}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Video scrubber"
            className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary hover:h-2.5 transition-all"
          />

          {/* Chapter markers pins */}
          {chapters.map((ch) => {
            const leftPct = (ch.timestampSeconds / durationSeconds) * 100;
            return (
              <div
                key={ch.id}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 w-1 h-2 bg-white/80 rounded-full pointer-events-none transform -translate-x-1/2"
                title={`${ch.timestampFormatted}: ${ch.title}`}
              />
            );
          })}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-white hover:text-primary transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => skipSeconds(-10)}
              className="p-1 text-white hover:text-primary transition-colors"
              title="Skip -10s"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => skipSeconds(10)}
              className="p-1 text-white hover:text-primary transition-colors"
              title="Skip +10s"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-white hover:text-primary transition-colors"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Time label */}
            <span className="font-mono text-[11px] text-slate-300 ml-1">
              {formatSeconds(currentTime)} / {formatSeconds(durationSeconds)}
            </span>
          </div>

          <div className="flex items-center space-x-2 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-card border border-border text-foreground rounded-xl shadow-xl p-1 z-30 min-w-[70px]">
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setPlaybackSpeed(spd);
                        setShowSpeedMenu(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1 text-xs rounded-lg text-left hover:bg-muted font-medium",
                        playbackSpeed === spd && "text-primary font-bold"
                      )}
                    >
                      <span>{spd}x</span>
                      {playbackSpeed === spd && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (containerRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                  } else {
                    containerRef.current.requestFullscreen?.();
                  }
                }
              }}
              className="p-1 text-white hover:text-primary transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

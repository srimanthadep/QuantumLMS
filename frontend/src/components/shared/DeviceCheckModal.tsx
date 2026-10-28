import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Volume2, Wifi, CheckCircle2, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DeviceCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetClassId: string;
  classTitle: string;
}

export const DeviceCheckModal: React.FC<DeviceCheckModalProps> = ({
  open,
  onOpenChange,
  targetClassId,
  classTitle,
}) => {
  const [camReady, setCamReady] = useState(true);
  const [micLevel, setMicLevel] = useState(65);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [pingMs, setPingMs] = useState(24);
  const navigate = useNavigate();

  // Simulate mic level wave
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setMicLevel(Math.floor(40 + Math.random() * 45));
    }, 400);
    return () => clearInterval(interval);
  }, [open]);

  const handleJoin = () => {
    onOpenChange(false);
    navigate(`/student/classroom/${targetClassId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Video className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Pre-Join Hardware & Device Check
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground truncate">
            Classroom: {classTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Video stream preview placeholder */}
        <div className="rounded-xl overflow-hidden bg-slate-900 border border-border/80 aspect-video relative flex flex-col items-center justify-center text-white">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center mb-2">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xs font-semibold text-slate-200">HD Webcam (Integrated 1080p)</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="h-3 w-3" /> Camera Feed Healthy
            </p>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-xs">
            <span className="text-[11px] font-mono text-slate-300">Preview Mode</span>
            <button
              onClick={() => setCamReady(!camReady)}
              className="text-[11px] px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-medium"
            >
              {camReady ? "Disable Cam" : "Enable Cam"}
            </button>
          </div>
        </div>

        {/* Diagnostics row */}
        <div className="space-y-3 pt-1">
          {/* Mic */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
            <div className="flex items-center gap-3">
              <Mic className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Microphone Input</p>
                <p className="text-[11px] text-muted-foreground">Default Audio Device</p>
              </div>
            </div>
            {/* Visual audio meter */}
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>

          {/* Speaker */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Speakers / Headphones</p>
                <p className="text-[11px] text-muted-foreground">
                  {speakerTested ? "Test sound played OK" : "Verify sound output"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSpeakerTested(true)}
              className="h-7 text-xs px-2.5 font-semibold"
            >
              {speakerTested ? "Tested ✓" : "Play Chime"}
            </Button>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
            <div className="flex items-center gap-3">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs font-bold text-foreground">Broadband Quality</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {pingMs}ms latency • 50 Mbps stable
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Optimal
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs h-9">
            Cancel
          </Button>
          <Button onClick={handleJoin} className="text-xs h-9 font-bold gap-1.5 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Enter Live Classroom
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

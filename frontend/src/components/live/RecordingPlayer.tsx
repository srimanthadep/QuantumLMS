import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui"
import { api } from "@/lib/api"

export type ReplayChapter = { title: string; start_seconds: number; end_seconds: number }
type Playback = { url: string; expires_in: number; duration_seconds: number; qualities: Record<string,{url:string}>; chapters: ReplayChapter[] }
const time = (seconds: number) => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`
export default function RecordingPlayer({ recordingId }: { recordingId: string }) {
  const video=useRef<HTMLVideoElement>(null), [playback,setPlayback]=useState<Playback|null>(null),[error,setError]=useState(""),[quality,setQuality]=useState("720p"),[position,setPosition]=useState(0)
  const bookmark=useRef({ at:0,playing:false })
  const load=useCallback(async()=>{
    try { const data=await api.post<Playback>(`/recordings/${recordingId}/playback`,{}); const node=video.current; if(node) bookmark.current={ at:node.currentTime,playing:!node.paused }; setPlayback(data); setError("") }
    catch(e){ video.current?.pause(); setPlayback(null);setError(e instanceof Error?e.message:"Replay unavailable") }
  },[recordingId])
  useEffect(()=>{ bookmark.current={ at:0,playing:false };setPlayback(null);void load() },[load])
  useEffect(()=>{ if(!playback)return;const timer=window.setTimeout(()=>void load(),Math.max(1000,Math.min(240000,playback.expires_in*800)));return()=>window.clearTimeout(timer) },[playback,load])
  return <div className="space-y-4">
    {error?<div role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}<Button type="button" variant="ghost" size="sm" onClick={()=>void load()}>Retry</Button></div>:!playback?<p role="status" className="p-8 text-center text-sm text-muted-foreground">Preparing secure playback…</p>:<>
      <video ref={video} className="aspect-video w-full rounded-xl bg-black" controls playsInline preload="metadata" src={playback.qualities[quality]?.url??playback.url} onTimeUpdate={()=>setPosition(video.current?.currentTime??0)} onLoadedMetadata={()=>{ if(!video.current)return;video.current.currentTime=Math.min(bookmark.current.at,video.current.duration||0);if(bookmark.current.playing)void video.current.play().catch(()=>undefined) }} onError={()=>setError("Playback could not load. Retry to request a fresh link.")} />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Video quality<select className="rounded-lg border border-border bg-surface p-2" value={quality in playback.qualities?quality:Object.keys(playback.qualities)[0]} onChange={e=>{ if(video.current)bookmark.current={at:video.current.currentTime,playing:!video.current.paused};setQuality(e.target.value) }}>{Object.keys(playback.qualities).map(q=><option key={q}>{q}</option>)}</select></label>
      <div><h4 className="mb-2 text-sm font-semibold">Chapters</h4><div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">{playback.chapters.map((c,i)=><button type="button" key={`${i}:${c.start_seconds}`} onClick={()=>{ if(video.current){video.current.currentTime=c.start_seconds;void video.current.play().catch(()=>undefined)} }} className={`flex items-center gap-3 rounded-lg p-3 text-left text-sm ${position>=c.start_seconds && position<c.end_seconds?"bg-primary-soft text-primary-text":"hover:bg-surface-2"}`}><span className="font-mono text-xs">{time(c.start_seconds)}</span><span>{c.title}</span></button>)}</div></div>
    </>}
  </div>
}

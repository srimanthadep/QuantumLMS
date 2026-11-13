import { useEffect,useState } from "react"

import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"

import type { useSuperAdminStore } from "@/data/adminStore"

export default function PlatformHealthView({onToast}: {store:ReturnType<typeof useSuperAdminStore>;onToast:(m:string)=>void}) {

 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false)

 async function load(){try{setData(await api.get("/super-admin/health",{bypassCache:true}));setError("")}catch(e){setError(e instanceof Error?e.message:"Unable to measure health")}}

 useEffect(()=>{void load();const t=setInterval(()=>void load(),30000);return()=>clearInterval(t)},[])

 async function clear(){setBusy(true);try{const r=await api.post<{message:string}>("/super-admin/flush-cache");onToast(r.message);await load()}catch(e){setError(e instanceof Error?e.message:"Cache clear failed")}finally{setBusy(false)}}

 return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Platform health</h1><p className="text-sm text-muted-foreground">Measured API activity and durable processing queues</p></div><Button variant="outline" onClick={()=>void load()}>Refresh</Button></div>{error&&<p role="alert" className="text-destructive">{error}</p>}{!data?<p>Waiting for measurements…</p>:<><p className="text-xs text-muted-foreground">Observed {new Date(data.observedAt).toLocaleString()} · {data.scope}</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["API uptime",`${Math.floor(data.uptimeSeconds/60)} min`],["Request latency · p95",data.p95LatencyMs===null?"No samples":`${data.p95LatencyMs.toFixed(1)} ms`],["Database query",`${data.databaseLatencyMs.toFixed(1)} ms`],["Pool connections",`${data.poolClients} / ${data.maxPoolClients}`]].map(([title,value])=><div key={title} className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-surface p-5 space-y-3"><h2 className="font-semibold">Shared queues</h2>{Object.entries(data.queues).map(([key,value])=><div key={key} className="flex justify-between text-sm"><span>{key.replace(/_/g," ")}</span><strong>{String(value)}</strong></div>)}<p className="text-xs text-muted-foreground">A processing job with a current lease indicates active work. An empty queue does not establish worker health.</p></div><div className="rounded-2xl border bg-surface p-5 space-y-3"><h2 className="font-semibold">This API instance</h2><p className="text-sm">{data.requests} requests · {data.errors} server errors · {data.sampleSize} latency samples</p><p className="text-sm">{data.poolIdle} idle connections · {data.poolWaiting} waiting requests</p><Button disabled={busy} variant="outline" onClick={()=>void clear()}>Clear this instance’s caches</Button><p className="text-xs text-muted-foreground">Database snapshots must be managed through your database provider. No snapshot integration is configured here.</p></div></div><p className="text-sm text-muted-foreground">{data.limitations}</p></>}</div>

}

import { useEffect,useState } from "react"
import { api } from "@/lib/api"
import type { useSuperAdminStore } from "@/data/adminStore"
export default function SuperAdminSettingsView(_props:{store:ReturnType<typeof useSuperAdminStore>;onToast:(m:string)=>void}) {
 const [data,setData]=useState<any>(null),[error,setError]=useState("")
 useEffect(()=>{let active=true;api.get("/super-admin/settings").then(r=>{if(active)setData(r)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 return <div className="space-y-5"><h1 className="text-2xl font-bold">Deployment settings</h1>{error&&<p role="alert" className="text-destructive">{error}</p>}{data?<section className="rounded-2xl border bg-surface p-6 space-y-4"><p className="text-sm text-muted-foreground">{data.message}</p><dl className="grid gap-4 sm:grid-cols-2">{Object.entries(data.settings).map(([key,value])=><div key={key}><dt className="text-sm text-muted-foreground">{key.replace(/([A-Z])/g," $1")}</dt><dd className="font-medium">{String(value)}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Staff MFA is managed in Cognito. This page does not assert or modify the provider’s MFA policy.</p></section>:<p>Loading configuration…</p>}</div>
}

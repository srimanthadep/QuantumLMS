import { useCallback,useEffect,useState } from "react"
import { api } from "./api"
import { sessionGeneration } from "./sessionBoundary"
import type { NotificationSource,ShellNotification } from "@/components/shell/NotificationsMenu"
type Note={id:string;title:string;message:string;created_at:string;read_at:string|null;kind:ShellNotification["kind"]}
export default function usePersistedNotifications(onError:(message:string)=>void):NotificationSource {
 const [notes,setNotes]=useState<Note[]>([])
 const load=useCallback(async()=>{const generation=sessionGeneration();const result=await api.get<Note[]>("/notifications",{bypassCache:true});if(generation===sessionGeneration())setNotes(result)},[])
 useEffect(()=>{let alive=true;const refresh=()=>{void load().catch(e=>{if(alive)onError(e.message??"Unable to load notifications")})};refresh();const timer=setInterval(refresh,30000);return()=>{alive=false;clearInterval(timer)}},[load,onError])
 async function read(ids:string[]){try{await Promise.all(ids.map(id=>api.post(`/notifications/${id}/read`)));await load()}catch(e){onError(e instanceof Error?e.message:"Unable to mark notifications read")}}
 return {items:notes.map(n=>({...n,timestamp:new Date(n.created_at).toLocaleString(),read:Boolean(n.read_at)})),onSelect:n=>void read([n.id]),onMarkAllRead:()=>void read(notes.filter(n=>!n.read_at).map(n=>n.id))}
}

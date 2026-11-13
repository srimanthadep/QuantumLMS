import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import type { Db, Tx } from "../db/client.js"
import { realtime_consumers, realtime_deliveries, realtime_events } from "../db/schema.js"

export async function publishRealtime(tx:Tx,channel:string,event:string,payload:unknown,sender?:unknown) {
  await tx.insert(realtime_events).values({channel,event,payload:["evaluators","notifications"].includes(channel)?{refresh:true}:payload,sender,
    expires_at:new Date(Date.now()+(event==="typing"?10_000:300_000))})
}
/** One consumer per API process, sharing its existing pool. Ack IDs (not a sequence cursor) survive out-of-order commits. */
export async function createRealtimeConsumer(db:Db,deliver:(event:typeof realtime_events.$inferSelect)=>Promise<void>) {
  const id=randomUUID()
  await db.transaction(async tx=>{
    await tx.insert(realtime_consumers).values({id})
    // Existing committed events are already represented by the initial REST snapshot.
    // An earlier insert still in flight is invisible here and will be delivered when it commits.
    await tx.execute(sql`insert into lms.realtime_deliveries(consumer_id,event_id) select ${id}::uuid,id from lms.realtime_events where expires_at>now()`)
  })
  let running=false,stopped=false
  return {
    id,
    async poll() {
      if(running||stopped)return;running=true
      try {
        await db.update(realtime_consumers).set({heartbeat_at:new Date()}).where(eq(realtime_consumers.id,id))
        const events=await db.execute(sql`select e.* from lms.realtime_events e where e.expires_at>now()
          and not exists(select 1 from lms.realtime_deliveries d where d.consumer_id=${id}::uuid and d.event_id=e.id)
          order by e.created_at,e.id limit 200`)
        for(const row of events.rows){await deliver(row as typeof realtime_events.$inferSelect);await db.insert(realtime_deliveries).values({consumer_id:id,event_id:String(row.id)}).onConflictDoNothing()}
        await db.execute(sql`delete from lms.realtime_events where expires_at<now()`)
        await db.execute(sql`delete from lms.realtime_consumers where heartbeat_at<now()-interval '10 minutes' and id<>${id}::uuid`)
      } finally {running=false}
    },
    async close(){stopped=true;while(running)await new Promise(resolve=>setTimeout(resolve,10));await db.delete(realtime_consumers).where(eq(realtime_consumers.id,id))},
  }
}

import { once } from "node:events"
import { buildApp } from "../src/app.js"
import { users } from "../src/db/schema.js"
import assert from "node:assert/strict"
import { after,before,test } from "node:test"
import { eq,sql } from "drizzle-orm"
import { createHarness,type TestHarness,type TestUser } from "./helpers.js"
import { notify } from "../src/modules/student/notify.js"
import { enqueueReminders,outboxSweep } from "../src/reliability/notifications.js"
import { createRealtimeConsumer,publishRealtime } from "../src/reliability/realtime.js"
import { notification_outbox,notifications,profiles,cohort_batches,courses,live_sessions,assessment_definitions,assessment_offerings,course_offers,recordings,media_assets,quizzes } from "../src/db/schema.js"
import { admit } from "../src/learning/admission.js"
let h:TestHarness,student:TestUser,admin:TestUser,id:string
before(async()=>{h=await createHarness();student=await h.user();admin=await h.user({groups:["admins"]});id=(await student.call("GET","/api/me")).body.id;await admin.call("GET","/api/me");await outboxSweep(h.ctx)})
after(async()=>{await h.ctx.db.delete(recordings);await h.ctx.db.delete(media_assets);await h.close()})
test("domain rollback leaves neither notification nor shared event; keys deduplicate concurrent producers",async()=>{
 await assert.rejects(h.ctx.db.transaction(async tx=>{await notify(tx,id,"system","Rolled back","x",undefined,undefined,{key:"rollback"});throw Error("rollback")}))
 assert.equal((await h.ctx.db.select().from(notification_outbox).where(eq(notification_outbox.event_key,`rollback:${id}`))).length,0)
 await Promise.all(Array.from({length:8},()=>h.ctx.db.transaction(tx=>notify(tx,id,"payment","Payment confirmed","x",undefined,undefined,{key:"dedup"}))))
 await Promise.all([outboxSweep(h.ctx),outboxSweep(h.ctx)])
 assert.equal((await h.ctx.db.select().from(notifications).where(eq(notifications.title,"Payment confirmed"))).length,1)
})
test("failed delivery retries after restart with no duplicate; preferences are checked at delivery",async()=>{
 await h.ctx.db.transaction(tx=>notify(tx,id,"class","Retry me","x",undefined,"classes",{key:"retry"}))
 await outboxSweep(h.ctx,{beforeDelivery:async()=>{throw Error("transport offline")}})
 let [row]=await h.ctx.db.select().from(notification_outbox).where(eq(notification_outbox.event_key,`retry:${id}`));assert.equal(row.attempts,1);assert.equal(row.delivered_at,null);assert.ok(row.last_error)
 await h.ctx.db.update(notification_outbox).set({available_at:new Date(0)}).where(eq(notification_outbox.id,row.id));await outboxSweep(h.ctx);await outboxSweep(h.ctx)
 ;[row]=await h.ctx.db.select().from(notification_outbox).where(eq(notification_outbox.id,row.id));assert.equal(row.attempts,2);assert.ok(row.delivered_at)
 assert.equal((await h.ctx.db.select().from(notifications).where(eq(notifications.id,row.id))).length,1)
 await notify(h.ctx.db,id,"class","Opted out","x",undefined,"classes",{key:"prefs"});await h.ctx.db.update(profiles).set({notification_prefs:{classes:false}}).where(eq(profiles.id,id));await outboxSweep(h.ctx)
 assert.equal((await h.ctx.db.select().from(notifications).where(eq(notifications.title,"Opted out"))).length,0)
 await h.ctx.db.update(profiles).set({notification_prefs:{}}).where(eq(profiles.id,id))
})
test("shared consumers receive committed events despite out-of-order commits and recover after a delivery failure",async()=>{
 await publishRealtime(h.ctx.db,"test","already-in-snapshot",{})
 const first:string[]=[],second:string[]=[]
 const a=await createRealtimeConsumer(h.ctx.db,async e=>{if(e.channel==="test")first.push(e.event)})
 let fail=true
 const b=await createRealtimeConsumer(h.ctx.db,async e=>{if(e.channel==="test"){if(fail){fail=false;throw Error("restart")};second.push(e.event)}})
 try{
  let release!:()=>void,inserted!:()=>void;const ready=new Promise<void>(resolve=>inserted=resolve),gate=new Promise<void>(resolve=>release=resolve)
  const slow=h.ctx.db.transaction(async tx=>{await publishRealtime(tx,"test","earlier-insert",{});inserted();await gate})
  await ready;await publishRealtime(h.ctx.db,"test","later-commit",{});await a.poll();assert.deepEqual(first,["later-commit"]);await assert.rejects(b.poll())
  release();await slow;await a.poll();await b.poll();await b.poll()
  assert.deepEqual(first,["later-commit","earlier-insert"]);assert.deepEqual([...second].sort(),["earlier-insert","later-commit"])
 }finally{await a.close();await b.close()}
})
test("reminders and threshold alerts persist once; cancelled sessions and unpublished replays are suppressed",async()=>{
 const now=Date.now(),course="notify-course",batch="notify-batch",session="notify-session"
 await h.ctx.db.insert(courses).values({id:course,code:"NOTIFY",title:"Notifications",category:"AI",instructor:"Teacher",level:"Beginner"})
 await h.ctx.db.insert(course_offers).values({id:"notify-offer",course_id:course,title:"Live",mode:"live",status:"Published",price:0})
 await h.ctx.db.insert(cohort_batches).values({id:batch,course_id:course,offer_id:"notify-offer",name:"Cohort",instructor:"Teacher",start_date:"2026-01-01",end_date:"2030-01-01",starts_at:new Date(now-86400000),ends_at:new Date(now+86400000),registration_deadline:new Date(now+3600000),max_seats:250,minimum_paid_registrations:1,lifecycle:"Recruiting"})
 await h.ctx.db.transaction(tx=>admit(tx,{batchId:batch,student:id,paidAt:new Date()}))
 await h.ctx.db.insert(live_sessions).values({id:session,batch_id:batch,occurrence_key:session,title:"Upcoming class",starts_at:new Date(now+600000),ends_at:new Date(now+3600000)})
 const [def]=await h.ctx.db.insert(assessment_definitions).values({course_id:course,kind:"quiz",title:"Quiz"}).returning()
 await h.ctx.db.insert(quizzes).values({id:"notify-quiz",course_id:course,title:"Quiz",duration_minutes:30,passing_pct:40,due_at:new Date(now+3600000)})
 await h.ctx.db.insert(assessment_offerings).values({quiz_id:"notify-quiz",definition_id:def.id,definition_version:1,course_id:course,batch_id:batch,context:"batch",title:"Upcoming quiz",due_at:new Date(now+3600000)})
 await enqueueReminders(h.ctx);await enqueueReminders(h.ctx)
 await h.ctx.db.update(live_sessions).set({status:"Cancelled"}).where(eq(live_sessions.id,session))
 await outboxSweep(h.ctx)
 const notes=(await student.call("GET","/api/notifications")).body as {title:string}[]
 assert.equal(notes.filter(n=>n.title==="Assessment released").length,1);assert.equal(notes.filter(n=>n.title==="Assessment due soon").length,1);assert.equal(notes.filter(n=>n.title==="Class starting soon").length,0)
 const staff=(await admin.call("GET","/api/notifications")).body as {title:string}[];assert.equal(staff.filter(n=>n.title==="Registration target reached").length,1)
 await h.ctx.db.insert(media_assets).values({id:"notify-asset",course_id:course,owner_id:id,session_id:session,source_key:"videos/notify.mp4",state:"ready"})
 await h.ctx.db.insert(recordings).values({id:"notify-replay",asset_id:"notify-asset",session_id:session,title:"Replay",release_at:new Date(now-1000),expires_at:new Date(now+3600000),status:"Draft"})
 await notify(h.ctx.db,id,"class","Replay published","x",undefined,undefined,{key:"replay-suppressed",guard:{batch,recording:"notify-replay",version:1}});await outboxSweep(h.ctx)
 assert.equal((await h.ctx.db.select().from(notifications).where(eq(notifications.title,"Replay published"))).length,0)
 await h.ctx.db.update(recordings).set({status:"Published"}).where(eq(recordings.id,"notify-replay"));await notify(h.ctx.db,id,"class","Replay ready","x",undefined,undefined,{key:"replay-ready",guard:{batch,recording:"notify-replay",version:1}});await outboxSweep(h.ctx)
 assert.equal((await h.ctx.db.select().from(notifications).where(eq(notifications.title,"Replay ready"))).length,1)
})
test("academy profile is durable and unsupported security toggles are rejected",async()=>{
 assert.equal((await admin.call("PATCH","/api/admin/settings",{name:"Saved Academy"})).status,200)
 assert.equal((await admin.call("GET","/api/admin/settings")).body.settings.name,"Saved Academy")
 assert.equal((await admin.call("PATCH","/api/admin/settings",{requireMfaForStaff:true})).status,400)
 const events=await h.ctx.db.execute(sql`select * from lms.audit_events where action='academy.profile-updated'`);assert.ok(events.rows.length>=1)
})

 test("two API instances deliver the same committed update to authorized WebSockets",{timeout:15000},async()=>{
  const previous=h.ctx.config.REALTIME_POLL_MS;h.ctx.config.REALTIME_POLL_MS=30
  const a=await buildApp(h.ctx,{logger:false}),b=await buildApp(h.ctx,{logger:false});h.ctx.config.REALTIME_POLL_MS=previous
  await a.ready();await b.ready()
  const options={socket:{remoteAddress:"127.0.0.1"} as never,headers:{authorization:`Bearer ${student.token}`}}
  const wa=await a.injectWS("/api/ws",options),wb=await b.injectWS("/api/ws",options)
  try{
   // subscribe acknowledgement drains the handshake before testing the shared event.
   for(const socket of [wa,wb]){const next=once(socket,"message");socket.send(JSON.stringify({action:"subscribe",channel:`chat:${id}`}));await next}
   const receive=(socket:typeof wa)=>new Promise<any>(resolve=>{const listen=(raw:unknown)=>{const value=JSON.parse(String(raw));if(value.event==="test-shared"){socket.off("message",listen);resolve(value)}};socket.on("message",listen)})
   const first=receive(wa),second=receive(wb)
   await h.ctx.db.transaction(tx=>publishRealtime(tx,`chat:${id}`,"test-shared",{saved:true}))
   const [one,two]=await Promise.all([first,second]);assert.equal(one.event_id,two.event_id);assert.equal(one.payload.saved,true);assert.ok(h.ctx.pool.totalCount<=4)
  }finally{wa.terminate();wb.terminate();await a.close();await b.close()}
 })
 test("student edits persist and disabling preserves records while rejecting the next access",async()=>{
  const other=await h.user(),otherId=(await other.call("GET","/api/me")).body.id
  assert.equal((await admin.call("PATCH",`/api/admin/students/${otherId}`,{name:"Real Name"})).status,200)
  assert.equal((await other.call("GET","/api/me")).body.full_name,"Real Name")
  assert.equal((await admin.call("PATCH",`/api/admin/students/${otherId}`,{status:"Completed"})).status,400)
  assert.equal((await admin.call("DELETE",`/api/admin/students/${otherId}`)).status,200)
  assert.equal((await other.call("GET","/api/me")).status,403)
  assert.ok((await h.ctx.db.select().from(users).where(eq(users.id,otherId)))[0].disabled_at)
 })

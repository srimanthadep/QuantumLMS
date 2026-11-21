import assert from "node:assert/strict"
import { test } from "node:test"
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { createHarness } from "./helpers.js"
import { courses,cohort_batches,live_sessions,media_assets,media_variants,recordings,batch_registrations,entitlement_grants,session_attendance } from "../src/db/schema.js"

test("250 admitted students concurrently join and request exact-batch replay within the configured pool",{timeout:120000},async()=>{
 const h=await createHarness()
 try{
  const learners=await Promise.all(Array.from({length:250},()=>h.user()))
  const ids:string[]=[]
  for(let i=0;i<learners.length;i+=20){const results=await Promise.all(learners.slice(i,i+20).map(u=>u.call("GET","/api/me")));for(const r of results){assert.equal(r.status,200);ids.push(r.body.id)}}
  const now=Date.now(),course="load-course",batch="load-batch",live="load-live",ended="load-ended",asset="load-asset",replay="load-replay"
  await h.ctx.db.insert(courses).values({id:course,code:"LOAD",title:"Load cohort",category:"AI",instructor:"Teacher",level:"Beginner"})
  await h.ctx.db.insert(cohort_batches).values({id:batch,course_id:course,name:"250 learners",instructor:"Teacher",max_seats:250,start_date:"2026-01-01",end_date:"2030-01-01",starts_at:new Date(now-86400000),ends_at:new Date(now+86400000),lifecycle:"Running"})
  await h.ctx.db.insert(batch_registrations).values(ids.map(student_id=>({id:randomUUID(),batch_id:batch,student_id,state:"confirmed",confirmed_at:new Date()})))
  await h.ctx.db.insert(entitlement_grants).values(ids.map(student_id=>({id:randomUUID(),course_id:course,batch_id:batch,student_id,source_type:"manual",source_id:`load:${student_id}`})))
  await h.ctx.db.insert(live_sessions).values([{id:live,batch_id:batch,occurrence_key:live,title:"Live class",starts_at:new Date(now-60000),ends_at:new Date(now+3600000),status:"Live",provider:"meet_link",join_url:"https://meet.google.com/abc-defg-hij"},{id:ended,batch_id:batch,occurrence_key:ended,title:"Replay class",starts_at:new Date(now-3600000),ends_at:new Date(now-1800000),status:"Ended",actual_end:new Date(now-1800000)}])
  await h.ctx.db.insert(media_assets).values({id:asset,course_id:course,owner_id:ids[0],session_id:ended,source_key:"videos/load-source.mp4",state:"ready",duration_seconds:60})
  await h.ctx.db.insert(media_variants).values({asset_id:asset,quality:"720p",key:"videos/load-720.mp4",bytes:20,height:720})
  await h.ctx.db.insert(recordings).values({id:replay,session_id:ended,batch_id:batch,asset_id:asset,title:"Published replay",status:"Published",release_at:new Date(now-60000),expires_at:new Date(now+3600000)})
  const times:number[]=[],started=performance.now()
  await Promise.all(learners.flatMap(user=>[`/api/sessions/${live}/join`,`/api/recordings/${replay}/playback`].map(async path=>{const at=performance.now();const r=await user.call("POST",path,{});times.push(performance.now()-at);assert.equal(r.status,200,`${path}: ${JSON.stringify(r.body)}`)})))
  times.sort((a,b)=>a-b)
  const attendance=await h.ctx.db.execute(sql`select count(*)::int as n from lms.session_attendance where session_id=${live}`);assert.equal(attendance.rows[0].n,250);assert.ok(h.ctx.pool.totalCount<=4)
  console.log(JSON.stringify({load:"250 students / 500 concurrent authorized requests",elapsedMs:Math.round(performance.now()-started),medianMs:Math.round(times[249]),p95Ms:Math.round(times[474]),p99Ms:Math.round(times[494]),poolClients:h.ctx.pool.totalCount,scope:"In-process HTTP injection, local PostgreSQL; authorization/signing only, no video throughput or external provider"}))
  await h.ctx.db.delete(recordings);await h.ctx.db.delete(media_variants);await h.ctx.db.delete(media_assets)
 }finally{await h.ctx.db.delete(recordings);await h.ctx.db.delete(media_variants);await h.ctx.db.delete(media_assets);await h.ctx.db.delete(session_attendance);await h.close()}
})

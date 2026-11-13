import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { eq } from "drizzle-orm"
import { buildApp } from "../src/app.js"
import { recordingModule } from "../src/recordings/routes.js"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { batch_teachers, cohort_batches, courses, live_sessions, lessons, media_assets, processing_jobs, recordings, recording_chapters, recording_provider_events, recording_revisions, session_attendance } from "../src/db/schema.js"
import { admit } from "../src/learning/admission.js"
import { claimJob, failJob, finishJob } from "../src/media/jobs.js"
import { authorizeRecordingAsset } from "../src/recordings/access.js"

let h:TestHarness,admin:TestUser,teacher:TestUser,outsider:TestUser,student:TestUser,other:TestUser,teacherId:string,studentId:string,recordingId:string,assetId:string,key:string
const course="replay-course",batch="replay-batch",otherBatch="other-replay-batch",session=randomUUID()
before(async()=>{
  h=await createHarness();admin=await h.user({groups:["admins"]});teacher=await h.user({groups:["teachers"]});outsider=await h.user({groups:["teachers"]});student=await h.user();other=await h.user()
  teacherId=(await teacher.call("GET","/api/me")).body.id;studentId=(await student.call("GET","/api/me")).body.id;const otherId=(await other.call("GET","/api/me")).body.id
  await h.ctx.db.insert(courses).values({id:course,code:"REPLAY",title:"Replay course",category:"AI",instructor:"Teacher",level:"Beginner"})
  for(const id of [batch,otherBatch])await h.ctx.db.insert(cohort_batches).values({id,course_id:course,name:id,instructor:"Teacher",start_date:"2026-01-01",end_date:"2030-01-01",starts_at:new Date(Date.now()-86400000),ends_at:new Date(Date.now()+86400000),max_seats:250})
  await h.ctx.db.insert(batch_teachers).values({batch_id:batch,teacher_id:teacherId})
  await h.ctx.db.transaction(tx=>admit(tx,{batchId:batch,student:studentId}));await h.ctx.db.transaction(tx=>admit(tx,{batchId:otherBatch,student:otherId}))
  await h.ctx.db.insert(live_sessions).values({id:session,batch_id:batch,teacher_id:teacherId,occurrence_key:`recording:${session}`,title:"Gen AI session",status:"Ended",starts_at:new Date(Date.now()-5*3600000),ends_at:new Date(Date.now()-3*3600000),actual_start:new Date(Date.now()-5*3600000),actual_end:new Date(Date.now()-3*3600000)})
})
after(async()=>{
  try {
    await h.ctx.db.delete(recording_chapters);await h.ctx.db.delete(recording_revisions);await h.ctx.db.delete(recordings);await h.ctx.db.delete(recording_provider_events)
    await h.ctx.db.delete(processing_jobs);await h.ctx.db.delete(media_assets);await h.ctx.db.delete(session_attendance);await h.ctx.db.delete(live_sessions).where(eq(live_sessions.batch_id,batch))
  }finally{await h.close()}
})
async function upload(target=session){
  const bytes=Buffer.from("0000ftyprecording fixture"),created=await teacher.call("POST","/api/recordings/uploads",{session_id:target,filename:"class.mp4",content_type:"video/mp4",bytes:bytes.length})
  assert.equal(created.status,200,JSON.stringify(created.body));const id=created.body.asset_id as string
  const [asset]=await h.ctx.db.select().from(media_assets).where(eq(media_assets.id,id));await h.ctx.storage.put(asset.source_key,bytes,"video/mp4")
  assert.equal((await teacher.call("POST",`/api/recordings/assets/${id}/finalize`,{})).status,200)
  return id
}
async function process(id:string){
  const job=await claimJob(h.ctx.db);assert.ok(job);assert.equal(job.asset_id,id)
  const variant=`videos/assets/${id}/${job.lease_token}/720p.mp4`;await h.ctx.storage.put(variant,Buffer.from("ready"),"video/mp4")
  const result={duration:60,variants:[{quality:"720p",key:variant,bytes:5,height:720}],transcript:[{start:0,end:30,text:"Introduction"},{start:30,end:60,text:"Working with prompts"}],chapters:[{start:0,title:"Introduction"},{start:30,title:"Prompt design"}]}
  assert.equal(await finishJob(h.ctx.db,job,result),true);assert.equal(await finishJob(h.ctx.db,job,result),false)
  return variant
}
async function detail(){const result=await teacher.call("GET",`/api/recordings/${recordingId}`);assert.equal(result.status,200);return result.body}

test("manual upload is scoped to an ended assigned session and processing is durable; duplicate completion does not duplicate chapters",async()=>{
  assert.equal((await outsider.call("POST","/api/recordings/uploads",{session_id:session,filename:"class.mp4",content_type:"video/mp4",bytes:30})).status,403)
  assetId=await upload();const attached=await teacher.call("POST","/api/recordings/attach",{session_id:session,asset_id:assetId});assert.equal(attached.status,200,JSON.stringify(attached.body));recordingId=attached.body.recording.id
  assert.equal((await teacher.call("POST",`/api/recordings/${recordingId}/publish`,{expected_version:1,publish:true})).status,409)
  key=await process(assetId);const d=await detail();assert.equal(d.asset.state,"ready");assert.equal(d.chapters.length,2);assert.equal(d.asset.transcript.length,2)
  assert.equal((await teacher.call("POST","/api/recordings/attach",{session_id:session,asset_id:assetId})).body.recording.id,recordingId)
  assert.equal((await h.ctx.db.select().from(recordings).where(eq(recordings.session_id,session))).length,1)
  // A teacher assigned only to this session can review its uploads, never the rest of the batch.
  await h.ctx.db.delete(batch_teachers).where(eq(batch_teachers.batch_id,batch))
  assert.equal((await teacher.call("GET",`/api/recordings/batches/${batch}/assets`)).status,403)
  const scoped=await teacher.call("GET",`/api/recordings/batches/${batch}/assets?session_id=${session}`)
  assert.equal(scoped.status,200);assert.deepEqual(scoped.body.assets.map((a:{id:string})=>a.id),[assetId])
  assert.equal((await teacher.call("GET",`/api/recordings/batches/${otherBatch}/assets?session_id=${session}`)).status,403)
  await h.ctx.db.insert(batch_teachers).values({batch_id:batch,teacher_id:teacherId})
})
test("chapter review validates bounds/order and publishing uses an explicit persisted version",async()=>{
  const d=await detail(),input={expected_version:d.recording.version,title:"Reviewed Gen AI session",summary:"Model fundamentals",release_at:d.recording.release_at,expires_at:d.recording.expires_at,chapters:[{title:"Introduction",start_seconds:0,end_seconds:20},{title:"Prompt design",start_seconds:20,end_seconds:60}]}
  assert.equal((await teacher.call("PATCH",`/api/recordings/${recordingId}`,{...input,chapters:[{title:"Out of bounds",start_seconds:0,end_seconds:61}]})).status,400)
  assert.equal((await teacher.call("PATCH",`/api/recordings/${recordingId}`,{...input,chapters:[{title:"First",start_seconds:20,end_seconds:40},{title:"Overlap",start_seconds:30,end_seconds:60}]})).status,400)
  const edited=await teacher.call("PATCH",`/api/recordings/${recordingId}`,input);assert.equal(edited.status,200,JSON.stringify(edited.body));assert.equal(edited.body.recording.status,"Draft")
  assert.equal((await teacher.call("POST",`/api/recordings/${recordingId}/publish`,{expected_version:1,publish:true})).status,409)
  const saved=await teacher.call("POST",`/api/recordings/${recordingId}/publish`,{expected_version:edited.body.recording.version,publish:true});assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.recording.status,"Published")
})
test("released playback requires exact-batch entitlement; catalogs/list metadata and generic media cannot bypass replay scope",async()=>{
  const playback=await student.call("POST",`/api/recordings/${recordingId}/playback`,{});assert.equal(playback.status,200,JSON.stringify(playback.body));assert.equal(playback.body.chapters.length,2);assert.equal(playback.body.expires_in,300)
  assert.equal((await other.call("POST",`/api/recordings/${recordingId}/playback`,{})).status,403)
  assert.equal((await outsider.call("POST",`/api/recordings/${recordingId}/playback`,{})).status,403)
  assert.equal((await student.call("GET",`/api/recordings/${recordingId}`)).status,403)
  const list=await student.call("GET","/api/recordings");assert.equal(list.body.recordings.length,1);assert.ok(!JSON.stringify(list.body).includes("local-files"));assert.ok(!JSON.stringify(list.body).includes("transcript"))
  assert.equal((await other.call("GET","/api/recordings")).body.recordings.length,0)
  assert.equal((await other.call("GET",`/api/files/videos/${key}`)).status,403);assert.equal((await student.call("GET",`/api/files/videos/${key}`)).status,302)
  assert.equal((await h.app.inject({method:"GET",url:`/api/files/videos/${key}`})).statusCode,401)
  const module=await admin.call("POST",`/api/admin/courses/${course}/modules`,{title:"Ordinary curriculum"});const lesson=await admin.call("POST",`/api/admin/courses/${course}/lessons`,{moduleId:module.body.module.id,title:"Not a replay"})
  assert.equal((await admin.call("POST",`/api/admin/media/${assetId}/attach`,{lessonId:lesson.body.lesson.id})).status,400)
})
test("release/expiry and both replay switches are enforced by server, including signed-link expiry caps",async()=>{
  h.ctx.config.REPLAY_ENABLED=false
  assert.equal((await student.call("POST",`/api/recordings/${recordingId}/playback`,{})).status,403);h.ctx.config.REPLAY_ENABLED=true
  assert.equal((await admin.call("PUT",`/api/recordings/batches/${batch}/settings`,{replay_enabled:false})).status,200)
  assert.equal((await student.call("GET",`/api/files/videos/${key}`)).status,403)
  await admin.call("PUT",`/api/recordings/batches/${batch}/settings`,{replay_enabled:true})
  const [before]=await h.ctx.db.select().from(recordings).where(eq(recordings.id,recordingId))
  await h.ctx.db.update(recordings).set({release_at:new Date(Date.now()+3600000)}).where(eq(recordings.id,recordingId));assert.equal((await student.call("POST",`/api/recordings/${recordingId}/playback`,{})).status,403)
  await h.ctx.db.update(recordings).set({release_at:before.release_at,expires_at:new Date(Date.now()+45000)}).where(eq(recordings.id,recordingId))
  const short=await student.call("POST",`/api/recordings/${recordingId}/playback`,{});assert.equal(short.status,200);assert.ok(short.body.expires_in<=45)
  await h.ctx.db.update(recordings).set({expires_at:new Date(Date.now()-1000)}).where(eq(recordings.id,recordingId));assert.equal((await student.call("POST",`/api/recordings/${recordingId}/playback`,{})).status,403)
  await h.ctx.db.update(recordings).set({expires_at:before.expires_at}).where(eq(recordings.id,recordingId))
})
test("replacement retains old version history and scope, clears publication and preserves one recording",async()=>{
  const replacement=await upload();await process(replacement);const d=await detail()
  const result=await teacher.call("POST",`/api/recordings/${recordingId}/replace`,{asset_id:replacement,expected_version:d.recording.version})
  assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.recording.status,"Draft")
  assert.equal((await student.call("POST",`/api/recordings/${recordingId}/playback`,{})).status,403)
  assert.equal((await student.call("GET",`/api/files/videos/${key}`)).status,403)
  const actor=await h.ctx.resolveUser(await h.ctx.verifyToken(student.token));await assert.rejects(authorizeRecordingAsset(h.ctx,actor,assetId),/not available/)
  const history=await teacher.call("GET",`/api/recordings/${recordingId}/history`);assert.ok(history.body.revisions.some((r:{snapshot:{asset_id:string}})=>r.snapshot.asset_id===assetId))
  assert.equal((await detail()).chapters.length,2)
})
test("legacy lesson URL references also prevent converting course media into a batch recording",async()=>{
  const bytes=Buffer.from("0000ftyplegacy course media")
  const upload=await admin.call("POST","/api/admin/media/uploads",{courseId:course,filename:"legacy.mp4",contentType:"video/mp4",bytes:bytes.length})
  assert.equal(upload.status,200);const asset=upload.body.asset
  await h.ctx.storage.put(asset.source_key,bytes,"video/mp4");await admin.call("POST",`/api/admin/media/${asset.id}/finalize`,{})
  const variant=await process(asset.id)
  const [lesson]=await h.ctx.db.select().from(lessons).where(eq(lessons.course_id,course))
  await h.ctx.db.update(lessons).set({media_asset_id:null,video_url:`/api/files/videos/${variant}`}).where(eq(lessons.id,lesson.id))
  const d=await detail()
  assert.equal((await admin.call("POST",`/api/recordings/${recordingId}/replace`,{asset_id:asset.id,expected_version:d.recording.version})).status,409)
})
test("failed recording transcription remains failed and blocks publication; retry is explicit",async()=>{
  const failedSession=randomUUID()
  const [original]=await h.ctx.db.select().from(live_sessions).where(eq(live_sessions.id,session))
  await h.ctx.db.insert(live_sessions).values({...original,id:failedSession,occurrence_key:`failed:${failedSession}`})
  const id=await upload(failedSession)
  const attached=await teacher.call("POST","/api/recordings/attach",{session_id:failedSession,asset_id:id});assert.equal(attached.status,200)
  const job=await claimJob(h.ctx.db);assert.ok(job);await h.ctx.db.update(processing_jobs).set({max_attempts:1}).where(eq(processing_jobs.id,job.id));await failJob(h.ctx.db,job,Object.assign(new Error("no model"),{name:"TranscriptionError"}))
  const failed=await teacher.call("GET",`/api/recordings/assets/${id}`);assert.equal(failed.body.asset.state,"failed");assert.match(failed.body.asset.error,/Transcription failed/)
  assert.equal((await teacher.call("POST",`/api/recordings/${attached.body.recording.id}/publish`,{expected_version:1,publish:true})).status,409)
  assert.equal((await teacher.call("POST",`/api/recordings/assets/${id}/retry`,{})).status,200)
  assert.equal((await teacher.call("GET",`/api/recordings/assets/${id}`)).body.asset.state,"queued")
})
test("optional Zoom webhook is off by default and verifies signatures/timestamps, retains no secrets, and deduplicates notices",async()=>{
  assert.equal((await h.app.inject({method:"POST",url:"/api/webhooks/zoom/recordings",payload:{}})).statusCode,404)
  h.ctx.config.ZOOM_RECORDING_WEBHOOK_ENABLED=true;h.ctx.config.ZOOM_RECORDING_WEBHOOK_SECRET="isolated-test-secret-only"
  const app=await buildApp(h.ctx,{logger:false,modules:[recordingModule]})
  const body=JSON.stringify({event:"recording.completed",payload:{account_id:"test-account",object:{id:123456789,uuid:"meeting-instance",topic:"Session recording",recording_files:[{id:"provider-file-1",file_type:"MP4",status:"completed",download_url:"https://secret.invalid/download",download_token:"do-not-store"}]}}})
  const post=(text:string,stamp=Math.floor(Date.now()/1000).toString(),signature?:string)=>app.inject({method:"POST",url:"/api/webhooks/zoom/recordings",headers:{"content-type":"application/json","x-zm-request-timestamp":stamp,"x-zm-signature":signature??`v0=${createHmac("sha256",h.ctx.config.ZOOM_RECORDING_WEBHOOK_SECRET!).update(`v0:${stamp}:${text}`).digest("hex")}`},payload:text})
  try {
    assert.equal((await post(body,undefined,"v0="+"0".repeat(64))).statusCode,401);assert.equal((await post(body,"1000000000")).statusCode,401)
    const responses=await Promise.all([post(body),post(body)]);assert.deepEqual(responses.map(r=>r.statusCode),[200,200])
    const notices=await h.ctx.db.select().from(recording_provider_events);assert.equal(notices.length,1);assert.ok(!JSON.stringify(notices).includes("do-not-store"));assert.ok(!JSON.stringify(notices).includes("secret.invalid"))
    const challenge=await post(JSON.stringify({event:"endpoint.url_validation",payload:{plainToken:"challenge"}}));assert.equal(challenge.statusCode,200);assert.equal(challenge.json().encryptedToken,createHmac("sha256",h.ctx.config.ZOOM_RECORDING_WEBHOOK_SECRET!).update("challenge").digest("hex"))
    assert.equal((await h.ctx.db.select().from(recordings)).length,2,"provider notices never auto-create replay assets or chapters")
  } finally {h.ctx.config.ZOOM_RECORDING_WEBHOOK_ENABLED=false;h.ctx.config.ZOOM_RECORDING_WEBHOOK_SECRET=undefined;await app.close()}
})

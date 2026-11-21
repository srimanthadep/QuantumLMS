import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { admit } from "../src/learning/admission.js"
import { placementSweep } from "../src/placement/service.js"
import { grantAccess } from "../src/learning/entitlements.js"
import { batch_registrations, certificates, cohort_batches, completion_events, course_offers, job_application_events, job_applications, placement_jobs, placement_memberships, placement_support_requests, placement_tracks } from "../src/db/schema.js"

let h:TestHarness,admin:TestUser,student:TestUser,other:TestUser,mentor:TestUser,outsider:TestUser,studentId:string,otherId:string,mentorId:string,course:string,lesson:string,memberId:string,trackId:string,jobId:string,applicationId:string,credentialId:string
const batch="placement-cohort",offer="placement-live-offer",resumeData={name:"Placement Learner",email:"learner@example.test",skills:["TypeScript"],summary:"I build tested applications.",experience:[],projects:[],education:[]}
before(async()=>{
  h=await createHarness();admin=await h.user({groups:["admins"]});student=await h.user();other=await h.user();mentor=await h.user({groups:["support"]});outsider=await h.user({groups:["support"]})
  studentId=(await student.call("GET","/api/me")).body.id;otherId=(await other.call("GET","/api/me")).body.id;mentorId=(await mentor.call("GET","/api/me")).body.id
  course=(await admin.call("POST","/api/admin/courses",{title:"Placement foundations",category:"AI",instructor:"Teacher"})).body.course.id
  const module=(await admin.call("POST",`/api/admin/courses/${course}/modules`,{title:"Learning"})).body.module.id
  lesson=(await admin.call("POST",`/api/admin/courses/${course}/lessons`,{moduleId:module,title:"Complete this reading",type:"reading",summary:"Content"})).body.lesson.id
  await h.ctx.db.insert(course_offers).values({id:offer,course_id:course,title:"Live cohort",mode:"live",status:"Published"})
  await h.ctx.db.insert(cohort_batches).values({id:batch,course_id:course,offer_id:offer,name:"Completed cohort",instructor:"Teacher",start_date:"2026-01-01",end_date:"2026-02-01",starts_at:new Date(Date.now()-86400000),ends_at:new Date(Date.now()-3600000)})
  await h.ctx.db.transaction(tx=>admit(tx,{batchId:batch,student:studentId}))
  // Older releases gave a batch place course access; those grants stay valid, and completion is judged against them.
  const [registration]=await h.ctx.db.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id,batch),eq(batch_registrations.student_id,studentId)))
  await h.ctx.db.transaction(tx=>grantAccess(tx,{student:studentId,course,offer,batch,sourceType:"batch_registration",sourceId:registration.id}));await h.ctx.db.update(cohort_batches).set({lifecycle:"Completed"}).where(eq(cohort_batches.id,batch))
})
after(async()=>{try{await h.ctx.db.delete(placement_support_requests);await h.ctx.db.delete(job_application_events);await h.ctx.db.delete(job_applications);await h.ctx.db.delete(placement_jobs);await h.ctx.db.delete(placement_memberships);await h.ctx.db.delete(placement_tracks)}finally{await h.close()}})
async function member(){const r=await admin.call("GET","/api/placement/memberships");return r.body.memberships.find((m:{id:string})=>m.id===memberId)}
async function savedResume(){const r=await student.call("GET","/api/student/placement/resume");return r.body.resume}
async function createJob(title="AI Engineer"){const r=await mentor.call("POST","/api/staff/placement/jobs",{track_id:trackId,title,company:"Example company",location:"India",description:"Build and test AI applications with a product engineering team.",status:"Published"});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.job}

test("placement eligibility comes from a verified completed cohort, with restart-safe idempotent event consumption",async()=>{
  assert.deepEqual((await student.call("GET","/api/placement/memberships")).body.memberships,[])
  assert.equal((await student.call("POST",`/api/student/lessons/${lesson}/complete`,{done:true})).status,200)
  const completion=await student.call("POST","/api/student/completion/check",{course_id:course});assert.equal(completion.status,200,JSON.stringify(completion.body));credentialId=completion.body.results[0].credential.id
  assert.deepEqual((await student.call("GET","/api/placement/memberships")).body.memberships,[])
  await Promise.all([placementSweep(h.ctx.db),placementSweep(h.ctx.db)]);await placementSweep(h.ctx.db)
  const rows=(await student.call("GET","/api/placement/memberships")).body.memberships;assert.equal(rows.length,1);assert.equal(rows[0].eligibility,"Eligible");memberId=rows[0].id;trackId=rows[0].track_id
  assert.equal((await h.ctx.db.select().from(placement_memberships)).length,1)
})
test("mentors are explicitly assigned by admins; students and unrelated support accounts cannot read learner applications",async()=>{
  let m=await member()
  assert.equal((await mentor.call("GET","/api/placement/memberships")).body.memberships.length,0)
  assert.equal((await mentor.call("PUT",`/api/staff/placement/memberships/${memberId}`,{mentor_id:mentorId,status:"Active",expected_version:m.version,reason:"Self assignment is forbidden"})).status,403)
  assert.equal((await admin.call("PUT",`/api/staff/placement/memberships/${memberId}`,{mentor_id:studentId,status:"Active",expected_version:m.version,reason:"Student is not a mentor"})).status,400)
  const assigned=await admin.call("PUT",`/api/staff/placement/memberships/${memberId}`,{mentor_id:mentorId,status:"Active",expected_version:m.version,reason:"Assigned placement mentor"});assert.equal(assigned.status,200)
  assert.equal((await mentor.call("GET","/api/placement/memberships")).body.memberships.length,1)
  assert.equal((await outsider.call("GET","/api/placement/memberships")).body.memberships.length,0)
  assert.equal((await other.call("GET","/api/placement/memberships")).body.memberships.length,0)
})
test("published jobs require current eligibility and a saved owned resume; duplicate applications preserve one snapshot",async()=>{
  const j=await createJob();jobId=j.id
  assert.equal((await other.call("GET","/api/student/placement/jobs")).body.jobs.length,0)
  assert.equal((await other.call("POST",`/api/student/placement/jobs/${jobId}/apply`,{resume_updated_at:new Date().toISOString()})).status,403)
  assert.equal((await student.call("POST",`/api/student/placement/jobs/${jobId}/apply`,{resume_updated_at:new Date().toISOString(),resume_student_id:otherId})).status,400)
  await student.call("PUT","/api/student/resume",{data:resumeData});const resume=await savedResume()
  const attempts=await Promise.all(Array.from({length:6},()=>student.call("POST",`/api/student/placement/jobs/${jobId}/apply`,{resume_updated_at:resume.updated_at,cover_note:"Interested in this role"})))
  for(const r of attempts)assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(new Set(attempts.map(r=>r.body.application.id)).size,1);applicationId=attempts[0].body.application.id
  await student.call("PUT","/api/student/resume",{data:{...resumeData,skills:["Python"]}})
  const snapshot=(await student.call("GET",`/api/placement/applications/${applicationId}`)).body.application.resume_snapshot;assert.deepEqual(snapshot.skills,["TypeScript"])
  assert.equal((await h.ctx.db.select().from(job_application_events).where(eq(job_application_events.application_id,applicationId))).length,1)
  assert.equal((await mentor.call("GET",`/api/placement/applications/${applicationId}`)).status,200)
  assert.equal((await outsider.call("GET",`/api/placement/applications/${applicationId}`)).status,403)
  assert.equal((await other.call("GET",`/api/placement/applications/${applicationId}`)).status,403)
})
test("job closing and stale resume versions block new applications",async()=>{
  const second=await createJob("ML Engineer"),resume=await savedResume()
  assert.equal((await student.call("POST",`/api/student/placement/jobs/${second.id}/apply`,{resume_updated_at:"2000-01-01T00:00:00Z"})).status,409)
  await h.ctx.db.update(placement_jobs).set({closes_at:new Date(Date.now()-1000)}).where(eq(placement_jobs.id,second.id))
  assert.equal((await student.call("POST",`/api/student/placement/jobs/${second.id}/apply`,{resume_updated_at:resume.updated_at})).status,409)
})
test("application transitions are scoped, versioned and cannot be forged or silently overwritten",async()=>{
  const body={status:"Reviewing",expected_version:1,note:"Reviewing the saved resume"}
  assert.equal((await student.call("POST",`/api/placement/applications/${applicationId}/status`,body)).status,403)
  assert.equal((await outsider.call("POST",`/api/placement/applications/${applicationId}/status`,body)).status,403)
  const race=await Promise.all([mentor.call("POST",`/api/placement/applications/${applicationId}/status`,body),mentor.call("POST",`/api/placement/applications/${applicationId}/status`,{...body,status:"Rejected"})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409])
  const current=(await student.call("GET",`/api/placement/applications/${applicationId}`)).body;assert.equal(current.events.length,2);assert.equal(current.application.version,2)
})
test("support handoff reuses an open ticket and persists later messages without duplicate parallel tickets",async()=>{
  const message="Please help me prepare for the upcoming placement interviews."
  assert.equal((await other.call("POST",`/api/student/placement/memberships/${memberId}/help`,{message})).status,403)
  const requests=await Promise.all(Array.from({length:4},()=>student.call("POST",`/api/student/placement/memberships/${memberId}/help`,{message,application_id:applicationId})))
  for(const r of requests)assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(new Set(requests.map(r=>r.body.ticket_id)).size,1)
  const ticket=requests[0].body.ticket_id;await student.call("POST",`/api/student/placement/memberships/${memberId}/help`,{message:"Please also review my interview project explanation and examples."})
  const thread=(await student.call("GET","/api/student/support")).body;assert.ok(thread.tickets.some((t:{id:string})=>t.id===ticket));assert.equal(thread.replies.filter((r:{ticket_id:string})=>r.ticket_id===ticket).length,2)
})
test("revocation blocks applications immediately and out-of-order/repeated completion events cannot restore eligibility",async()=>{
  const j=await createJob("Data Scientist")
  const revoked=await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/revoke`,{reason:"Completion evidence needs an administrative review"});assert.equal(revoked.status,200)
  assert.equal((await student.call("POST",`/api/student/placement/jobs/${j.id}/apply`,{resume_updated_at:(await savedResume()).updated_at})).status,403)
  await placementSweep(h.ctx.db);assert.equal((await member()).eligibility,"Revoked")
  // Replaying the original completed event cannot override the canonical revoked credential.
  await h.ctx.db.update(completion_events).set({processed_at:null});await placementSweep(h.ctx.db);assert.equal((await member()).eligibility,"Revoked")
  const reissue=await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/reissue`,{reason:"Evidence reviewed and policy requirements confirmed"});assert.equal(reissue.status,200,JSON.stringify(reissue.body));await placementSweep(h.ctx.db)
  assert.equal((await member()).eligibility,"Eligible");assert.equal((await member()).mentor_id,mentorId)
})
test("mentor reassignment takes effect immediately and a persisted offer-to-placement workflow retains every status",async()=>{
  const j=await createJob("Platform Engineer"),applied=await student.call("POST",`/api/student/placement/jobs/${j.id}/apply`,{resume_updated_at:(await savedResume()).updated_at});assert.equal(applied.status,200)
  const id=applied.body.application.id,outsiderId=(await outsider.call("GET","/api/me")).body.id,m=await member()
  assert.equal((await admin.call("PUT",`/api/staff/placement/memberships/${memberId}`,{mentor_id:outsiderId,status:"Active",expected_version:m.version,reason:"Reassigned to the placement specialist"})).status,200)
  assert.equal((await mentor.call("GET",`/api/placement/applications/${id}`)).status,403)
  let version=1
  for(const status of ["Reviewing","Shortlisted","Interview","Offered","Placed"]){const changed=await outsider.call("POST",`/api/placement/applications/${id}/status`,{status,expected_version:version,note:`Confirmed application stage: ${status}`});assert.equal(changed.status,200,JSON.stringify(changed.body));version=changed.body.application.version}
  assert.equal((await member()).status,"Placed")
  const detail=(await student.call("GET",`/api/placement/applications/${id}`)).body;assert.equal(detail.events.length,6);assert.equal(detail.application.status,"Placed")
  assert.equal((await student.call("POST",`/api/placement/applications/${id}/status`,{status:"Withdrawn",expected_version:version,note:"Cannot change a completed placement"})).status,409)
  const latest=await member();await admin.call("PUT",`/api/staff/placement/memberships/${memberId}`,{mentor_id:mentorId,status:"Active",expected_version:latest.version,reason:"Approved continued placement support"})
})
test("track mode and active flags are configurable and enforced server-side; legacy certificates do not grant placement",async()=>{
  const track=(await h.ctx.db.select().from(placement_tracks).where(eq(placement_tracks.id,trackId)))[0]
  const changed=await admin.call("POST","/api/staff/placement/tracks",{...track,expected_version:track.version,eligible_modes:["self_paced"]});assert.equal(changed.status,200,JSON.stringify(changed.body));assert.equal((await member()).eligibility,"Revoked")
  const restored=await admin.call("POST","/api/staff/placement/tracks",{...track,expected_version:changed.body.track.version,eligible_modes:["live"],active:false});assert.equal(restored.status,200)
  assert.equal((await student.call("GET","/api/student/placement/jobs")).body.jobs.length,0)
  await h.ctx.db.insert(certificates).values({student_id:otherId,course_id:course,title:"Legacy certificate",course_title:"Old learning",status:"Earned",issued_at:new Date(),credential_id:`OLD-${randomUUID()}`,grade:"Completed"});await placementSweep(h.ctx.db)
  assert.equal((await other.call("GET","/api/placement/memberships")).body.memberships.length,0)
})

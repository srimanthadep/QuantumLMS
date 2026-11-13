import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq, sql } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { admit } from "../src/learning/admission.js"
import { grantAccess } from "../src/learning/entitlements.js"
import { completionSweep } from "../src/completion/service.js"
import { assignment_submissions, certificates, cohort_batches, completion_checks, completion_credentials, completions, course_offers, entitlement_grants, live_sessions, quiz_questions, session_attendance } from "../src/db/schema.js"

let h:TestHarness,admin:TestUser,student:TestUser,other:TestUser,evaluator:TestUser,outsider:TestUser,studentId:string,otherId:string,evaluatorId:string,course:string,lesson:string,definition:string,quiz:string,assignment:string,assignmentDefinition:string,credential:string,credentialId:string
const batch="assessment-batch",otherBatch="assessment-other-batch",offer="assessment-self",liveOffer="assessment-live",future=()=>new Date(Date.now()+86400000).toISOString()
const config={duration_minutes:30,questions:[{question:"Which value is two?",options:["One","Two"],correct_index:1,explanation:"Two is the second option."}]}
before(async()=>{
  h=await createHarness();admin=await h.user({groups:["admins"]});student=await h.user();other=await h.user();evaluator=await h.user({groups:["evaluators"]});outsider=await h.user({groups:["evaluators"]})
  studentId=(await student.call("GET","/api/me")).body.id;otherId=(await other.call("GET","/api/me")).body.id;evaluatorId=(await evaluator.call("GET","/api/me")).body.id
  course=(await admin.call("POST","/api/admin/courses",{title:"Assessment course",category:"Testing",instructor:"Assigned teacher"})).body.course.id
  const module=(await admin.call("POST",`/api/admin/courses/${course}/modules`,{title:"Required learning"})).body.module.id
  lesson=(await admin.call("POST",`/api/admin/courses/${course}/lessons`,{moduleId:module,title:"Read the foundations",type:"reading",summary:"Learning content"})).body.lesson.id
  await h.ctx.db.insert(course_offers).values([{id:offer,course_id:course,title:"Self paced",mode:"self_paced",status:"Published"},{id:liveOffer,course_id:course,title:"Live",mode:"live",status:"Published"}])
  for(const id of [batch,otherBatch])await h.ctx.db.insert(cohort_batches).values({id,course_id:course,offer_id:liveOffer,name:id,instructor:"Teacher",start_date:"2026-01-01",end_date:"2030-01-01",starts_at:new Date(Date.now()-86400000),ends_at:new Date(Date.now()+86400000),lifecycle:"Running",allow_late_join:true})
  await h.ctx.db.transaction(tx=>admit(tx,{batchId:batch,student:studentId}));await h.ctx.db.transaction(tx=>admit(tx,{batchId:otherBatch,student:otherId}))
})
after(async()=>{try{await h.ctx.db.delete(session_attendance).where(eq(session_attendance.student_id,studentId))}finally{await h.close()}})
async function draft(kind:"quiz"|"assignment",body:unknown){const r=await admin.call("POST","/api/admin/assessments/definitions",{course_id:course,kind,title:`Required ${kind}`,config:body});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.definition}
async function publish(id:string,version=1){const r=await admin.call("POST",`/api/admin/assessments/definitions/${id}/publish`,{expected_version:version});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.definition}
async function check(){const r=await student.call("POST","/api/student/completion/check",{course_id:course});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.results as any[]}
async function finishQuiz(answer:number){const start=await student.call("POST",`/api/student/quizzes/${quiz}/start`,{});assert.equal(start.status,200,JSON.stringify(start.body));assert.equal("correct_index" in start.body.questions[0],false);const submit=await student.call("POST",`/api/student/quiz-attempts/${start.body.attempt_id}/submit`,{answers:{"0":answer}});assert.equal(submit.status,200,JSON.stringify(submit.body));return submit.body}

test("authoring is admin-only and publishing rejects absent answer keys, invalid rubrics and inactive evaluator IDs",async()=>{
  assert.equal((await student.call("GET",`/api/admin/assessments/courses/${course}`)).status,403)
  const bad=await draft("quiz",{});assert.equal((await admin.call("POST",`/api/admin/assessments/definitions/${bad.id}/publish`,{expected_version:1})).status,400)
  const invalid=await draft("assignment",{criteria:[{title:"Quality",max_points:10,levels:[{label:"Invalid",points:20},{label:"None",points:0}]}],evaluator_ids:[evaluatorId]})
  assert.equal((await admin.call("POST",`/api/admin/assessments/definitions/${invalid.id}/publish`,{expected_version:1})).status,400)
  const noEvaluator=await draft("assignment",{criteria:[{title:"Quality",max_points:10,levels:[{label:"Complete",points:10},{label:"None",points:0}]}],evaluator_ids:[studentId]})
  assert.equal((await admin.call("POST",`/api/admin/assessments/definitions/${noEvaluator.id}/publish`,{expected_version:1})).status,400)
  const valid=await draft("quiz",config);definition=valid.id;await publish(definition)
})
test("assessment release freezes a definition and checks course/context/deadline; old CRUD cannot alter grading",async()=>{
  assert.equal((await admin.call("POST","/api/admin/assessments/offerings",{definition_id:definition,expected_version:1,batch_id:batch,offer_id:offer,due_at:future()})).status,400)
  assert.equal((await admin.call("POST","/api/admin/assessments/offerings",{definition_id:definition,expected_version:1,batch_id:batch})).status,400)
  const r=await admin.call("POST","/api/admin/assessments/offerings",{definition_id:definition,expected_version:1,batch_id:batch,due_at:future(),max_attempts:2});assert.equal(r.status,200,JSON.stringify(r.body));quiz=r.body.offering.quiz_id
  const edited=await admin.call("PATCH",`/api/admin/assessments/definitions/${definition}`,{expected_version:1,title:"Revised quiz",description:"Changed key",config:{...config,questions:[{...config.questions[0],correct_index:0}]}});assert.equal(edited.status,200)
  assert.equal((await h.ctx.db.select().from(quiz_questions).where(eq(quiz_questions.quiz_id,quiz)))[0].correct_index,1)
  assert.equal((await admin.call("POST","/api/admin/assessments/offerings",{definition_id:definition,expected_version:2,batch_id:batch,due_at:future()})).status,409)
  const history=await admin.call("GET",`/api/admin/assessments/definitions/${definition}/history`);assert.equal(history.body.versions[0].snapshot.config.questions[0].correct_index,1)
  assert.equal((await admin.call("POST",`/api/admin/courses/${course}/assignments`,{title:"Bypass"})).status,400)
})
test("cross-batch quiz denial and failed required assessment block a lesson-complete credential",async()=>{
  assert.equal((await other.call("POST",`/api/student/quizzes/${quiz}/start`,{})).status,403)
  assert.ok(!(await other.call("GET","/api/student/core")).body.quizzes.some((q:{id:string})=>q.id===quiz))
  const failed=await finishQuiz(0);assert.equal(failed.attempt.passed,false)
  const progress=await student.call("POST",`/api/student/lessons/${lesson}/complete`,{done:true});assert.equal(progress.status,200);assert.equal(progress.body.certificate,null)
  const result=(await check()).find(r=>r.context.batch_id===batch);assert.equal(result.credential,null);assert.ok(result.evidence.reasons.some((s:string)=>s.includes("Pass Required quiz")));assert.ok(result.evidence.reasons.some((s:string)=>s.includes("batch")))
})
test("passed quiz still cannot certify an unfinished batch; attempts are bounded independently per offering",async()=>{
  const passed=await finishQuiz(1);assert.equal(passed.attempt.passed,true)
  assert.equal((await student.call("POST",`/api/student/quizzes/${quiz}/start`,{})).status,400)
  assert.equal((await check()).find(r=>r.context.batch_id===batch).credential,null)
  await h.ctx.db.update(cohort_batches).set({lifecycle:"Completed",ends_at:new Date(Date.now()-1000)}).where(eq(cohort_batches.id,batch))
})
test("concurrent policy checks issue exactly one immutable completion and credential",async()=>{
  const results=await Promise.all(Array.from({length:8},()=>check())),ids=results.map(rows=>rows.find(r=>r.context.batch_id===batch).credential.credential_id)
  assert.equal(new Set(ids).size,1);credential=ids[0];credentialId=results[0].find(r=>r.context.batch_id===batch).credential.id
  const completionsRows=await h.ctx.db.select().from(completions).where(and(eq(completions.student_id,studentId),eq(completions.context_key,`batch:${batch}`)));assert.equal(completionsRows.length,1)
  assert.equal((completionsRows[0].policy_snapshot as {attendancePercent:number}).attendancePercent,0)
  assert.equal((await h.app.inject({method:"GET",url:`/api/public/certificates/${credential}`})).statusCode,200)
})
test("new policies preserve issued evidence; revoke/reissue requires a reason and rechecks join-click attendance",async()=>{
  const p=(await admin.call("GET",`/api/admin/assessments/policy?context_key=batch:${batch}`)).body.policy
  const updated=await admin.call("PUT","/api/admin/assessments/policy",{context_key:`batch:${batch}`,expected_version:p.version,rules:{...p.rules,attendancePercent:50}});assert.equal(updated.status,200)
  const unchanged=(await check()).find(r=>r.context.batch_id===batch);assert.equal(unchanged.credential.credential_id,credential);assert.equal(unchanged.policy.version,1)
  assert.equal((await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/revoke`,{reason:"short"})).status,400)
  assert.equal((await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/revoke`,{reason:"Attendance evidence needs correction"})).status,200)
  assert.equal((await h.app.inject({method:"GET",url:`/api/public/certificates/${credential}`})).statusCode,404)
  assert.equal((await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/reissue`,{reason:"Recheck the corrected evidence"})).status,409)
  const session=randomUUID();await h.ctx.db.insert(live_sessions).values({id:session,batch_id:batch,occurrence_key:session,title:"Verified join click fixture",starts_at:new Date(Date.now()-7200000),ends_at:new Date(Date.now()-3600000),status:"Ended"});await h.ctx.db.insert(session_attendance).values({session_id:session,student_id:studentId})
  const reissued=await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/reissue`,{reason:"Corrected evidence reviewed and approved"});assert.equal(reissued.status,200,JSON.stringify(reissued.body));assert.notEqual(reissued.body.credential.credential_id,credential)
  const again=await admin.call("POST",`/api/admin/assessments/credentials/${credentialId}/reissue`,{reason:"Corrected evidence reviewed and approved"});assert.equal(again.body.credential.id,reissued.body.credential.id)
  const old=(await h.ctx.db.select().from(completion_credentials).where(eq(completion_credentials.id,credentialId)))[0];assert.equal(old.credential_id,credential);assert.ok(old.revoked_at)
})
test("self-paced assignment authoring allocates real evaluators and preserves each graded attempt",async()=>{
  await h.ctx.db.transaction(tx=>grantAccess(tx,{student:studentId,course,offer,sourceType:"manual",sourceId:"self-pace-assessment"}))
  const d=await draft("assignment",{guidance:"Review the submitted repository",criteria:[{title:"Correctness",description:"Demonstrates the required result",max_points:10,levels:[{label:"Complete",points:10,description:"Correct"},{label:"Missing",points:0,description:"No result"}]}],evaluator_ids:[evaluatorId]});assignmentDefinition=d.id;await publish(d.id)
  const r=await admin.call("POST","/api/admin/assessments/offerings",{definition_id:d.id,expected_version:1,offer_id:offer,days_after_enrollment:30,max_attempts:2});assert.equal(r.status,200,JSON.stringify(r.body));assignment=r.body.offering.assignment_id
  assert.equal((await other.call("POST",`/api/student/assignments/${assignment}/submission`,{repo_url:"https://github.com/example/project"})).status,403)
  const first=await student.call("POST",`/api/student/assignments/${assignment}/submission`,{repo_url:"https://github.com/example/project"});assert.equal(first.status,200,JSON.stringify(first.body))
  assert.equal((await outsider.call("GET",`/api/evaluator/submissions/${first.body.id}`)).status,404)
  const workspace=await evaluator.call("GET",`/api/evaluator/submissions/${first.body.id}`);assert.equal(workspace.status,200,JSON.stringify(workspace.body));const criterion=workspace.body.rubric.criteria[0].id
  const failed=await evaluator.call("POST",`/api/evaluator/submissions/${first.body.id}/evaluation/finish`,{scores:{[criterion]:{points:2,comment:"Missing required checks"}},feedback:"Please implement the missing correctness checks in the repository.",release:true});assert.equal(failed.status,200,JSON.stringify(failed.body))
  assert.equal((await check()).find(r=>r.context.offer_id===offer).credential,null)
  const second=await student.call("POST",`/api/student/assignments/${assignment}/submission`,{repo_url:"https://github.com/example/project-v2"});assert.equal(second.status,200,JSON.stringify(second.body));assert.notEqual(second.body.id,first.body.id);assert.equal(second.body.attempt_number,2)
  const passed=await evaluator.call("POST",`/api/evaluator/submissions/${second.body.id}/evaluation/finish`,{scores:{[criterion]:{points:8,comment:"Meets requirements"}},feedback:"The revised implementation meets the required checks and is well documented.",release:true});assert.equal(passed.status,200,JSON.stringify(passed.body))
  assert.equal((await student.call("POST",`/api/student/assignments/${assignment}/submission`,{repo_url:"https://github.com/example/project-v3"})).status,400)
  const history=await h.ctx.db.select().from(assignment_submissions).where(and(eq(assignment_submissions.student_id,studentId),eq(assignment_submissions.assignment_id,assignment)));assert.deepEqual(history.map(s=>s.score).sort((a,b)=>a!-b!),[2,8])
  assert.equal((await admin.call("PATCH",`/api/admin/courses/${course}/assignments/${assignment}`,{maxMarks:1})).status,400)
})
test("durable completion sweep survives repeated runs and records only one self-paced credential",async()=>{
  await completionSweep(h.ctx.db);await completionSweep(h.ctx.db)
  const checks=await h.ctx.db.select().from(completion_checks).where(and(eq(completion_checks.student_id,studentId),eq(completion_checks.course_id,course)));assert.equal(checks[0].error,null);assert.equal(checks[0].processed_version,checks[0].requested_version)
  const rows=await h.ctx.db.select().from(completions).where(and(eq(completions.student_id,studentId),eq(completions.context_key,`offer:${offer}`)));assert.equal(rows.length,1)
})
test("relative self-paced deadlines and revoked access are enforced server-side",async()=>{
  await h.ctx.db.update(entitlement_grants).set({starts_at:new Date(Date.now()-40*86400000)}).where(and(eq(entitlement_grants.student_id,studentId),eq(entitlement_grants.offer_id,offer)))
  const r=await admin.call("POST","/api/admin/assessments/offerings",{definition_id:assignmentDefinition,expected_version:1,offer_id:offer,days_after_enrollment:30,required:false});assert.equal(r.status,200)
  assert.equal((await student.call("POST",`/api/student/assignments/${r.body.offering.assignment_id}/submission`,{repo_url:"https://github.com/example/late"})).status,400)
  const list=await student.call("GET","/api/student/core");const row=list.body.assignments.find((a:{id:string})=>a.id===r.body.offering.assignment_id);assert.ok(new Date(row.due_at)<new Date())
  await h.ctx.db.update(entitlement_grants).set({revoked_at:new Date()}).where(and(eq(entitlement_grants.student_id,studentId),eq(entitlement_grants.batch_id,batch)))
  assert.equal((await student.call("POST",`/api/student/quizzes/${quiz}/start`,{})).status,403)
})
test("legacy contexts and existing credential IDs remain explicit and unchanged",async()=>{
  const legacy=await h.ctx.db.execute(sql`select count(*)::int as n from lms.assessment_offerings where context='legacy' and definition_id is null and required=false`);assert.ok(Number(legacy.rows[0].n)>0)
  const id=`LEGACY-${randomUUID()}`;await h.ctx.db.insert(certificates).values({student_id:otherId,course_id:course,title:"Historical achievement",course_title:"Legacy title",status:"Earned",credential_id:id,grade:"Completed",issued_at:new Date("2024-01-01")})
  const verified=await h.app.inject({method:"GET",url:`/api/public/certificates/${id}`});assert.equal(verified.statusCode,200);assert.equal(verified.json().credential_id,id)
})

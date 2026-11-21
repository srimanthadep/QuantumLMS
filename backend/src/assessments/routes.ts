import { invalidateCatalogCache } from "../modules/student/courses.js"
import { and, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { assessment_definitions, assessment_definition_versions, assessment_offerings, audit_events, cohort_batches, completion_credentials, completion_policies, course_offers, courses, evaluator_assignments, lessons, users } from "../db/schema.js"
import { conflict, notFound } from "../errors.js"
import { authenticate, me, parse } from "../http.js"
import { checkStudent, contextPolicy, contextsFor, evaluateContext, reissueCredential, revokeCredential, savePolicy, type LearningContext } from "../completion/service.js"
import { checkEvaluators, createOffering, definitionInput, offeringInput, snapshotDefinition, validateDefinition } from "./authoring.js"
import { studentOfferings } from "./access.js"

async function resolveContext(ctx:AppContext,key:string):Promise<LearningContext> {
  if(key.startsWith("batch:")){const [b]=await ctx.db.select().from(cohort_batches).where(eq(cohort_batches.id,key.slice(6)));if(b?.course_id)return {course_id:b.course_id,batch_id:b.id,offer_id:b.offer_id,context_key:key}}
  if(key.startsWith("offer:")){const [o]=await ctx.db.select().from(course_offers).where(eq(course_offers.id,key.slice(6)));if(o?.course_id&&o.mode==="self_paced")return {course_id:o.course_id,batch_id:null,offer_id:o.id,context_key:key}}
  if(key.startsWith("legacy:")){const [c]=await ctx.db.select().from(courses).where(eq(courses.id,key.slice(7)));if(c)return {course_id:c.id,batch_id:null,offer_id:null,context_key:key}}
  throw notFound("Learning context not found")
}
export async function assessmentModule(app:FastifyInstance,ctx:AppContext) {
  await app.register(async scope=>{
    scope.addHook("preHandler",authenticate(ctx,["Admin","Super Admin"]))
    scope.get<{Params:{id:string}}>("/courses/:id",async req=>{
      const id=req.params.id
      const [definitions,offerings,offers,batches,evaluators,lessonRows]=await Promise.all([
        ctx.db.select().from(assessment_definitions).where(eq(assessment_definitions.course_id,id)).orderBy(desc(assessment_definitions.updated_at)),
        ctx.db.select().from(assessment_offerings).where(eq(assessment_offerings.course_id,id)).orderBy(desc(assessment_offerings.created_at)),
        ctx.db.select().from(course_offers).where(eq(course_offers.course_id,id)),
        ctx.db.select({id:cohort_batches.id,name:cohort_batches.name}).from(cohort_batches).where(eq(cohort_batches.course_id,id)),
        ctx.db.select({id:users.id,name:users.full_name,email:users.email}).from(users).where(sql`${users.role}='Evaluator' and ${users.disabled_at} is null`),
        ctx.db.select({id:lessons.id,title:lessons.title}).from(lessons).where(and(eq(lessons.course_id,id),sql`${lessons.archived_at} is null`)),
      ]);return {definitions,offerings,offers,batches,evaluators,lessons:lessonRows}
    })
    scope.post("/definitions",async req=>{
      const b=parse(definitionInput,req.body)
      return ctx.db.transaction(async tx=>{const [c]=await tx.select().from(courses).where(eq(courses.id,b.course_id));if(!c)throw notFound();const [definition]=await tx.insert(assessment_definitions).values({...b,created_by:me(req).id}).returning();await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"assessment.draft-created",target:definition.id,outcome:"success"});return {definition}})
    })
    scope.patch<{Params:{id:string}}>("/definitions/:id",async req=>{
      const b=parse(definitionInput.omit({course_id:true,kind:true}).extend({expected_version:z.number().int().positive()}),req.body)
      return ctx.db.transaction(async tx=>{const [d]=await tx.select().from(assessment_definitions).where(eq(assessment_definitions.id,req.params.id)).for("update");if(!d)throw notFound();if(d.version!==b.expected_version)throw conflict("Definition changed; reload before editing");await snapshotDefinition(tx,d);const {expected_version:_version,...values}=b;const [definition]=await tx.update(assessment_definitions).set({...values,version:d.version+1,status:"Draft",updated_at:new Date()}).where(eq(assessment_definitions.id,d.id)).returning();await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"assessment.draft-revised",target:d.id,outcome:`version ${definition.version}`});return {definition}})
    })
    scope.post<{Params:{id:string}}>("/definitions/:id/publish",async req=>{
      const b=parse(z.object({expected_version:z.number().int().positive()}),req.body)
      return ctx.db.transaction(async tx=>{const [d]=await tx.select().from(assessment_definitions).where(eq(assessment_definitions.id,req.params.id)).for("update");if(!d)throw notFound();if(d.version!==b.expected_version)throw conflict("Reload the latest definition");await validateDefinition(tx,d);const [definition]=await tx.update(assessment_definitions).set({status:"Published"}).where(eq(assessment_definitions.id,d.id)).returning();await snapshotDefinition(tx,definition);await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"assessment.definition-published",target:d.id,outcome:`version ${d.version}`});return {definition}})
    })
    scope.get<{Params:{id:string}}>("/definitions/:id/history",async req=>({versions:await ctx.db.select().from(assessment_definition_versions).where(eq(assessment_definition_versions.definition_id,req.params.id)).orderBy(desc(assessment_definition_versions.version))}))
    scope.post("/offerings",async req=>{const offering=await ctx.db.transaction(tx=>createOffering(tx,me(req),parse(offeringInput,req.body)));invalidateCatalogCache();return {offering}})
    scope.put<{Params:{id:string}}>("/offerings/:id/evaluators",async req=>{
      const b=parse(z.object({evaluator_ids:z.array(z.uuid()).min(1).max(50),reason:z.string().trim().min(5).max(1000)}),req.body)
      return ctx.db.transaction(async tx=>{const [o]=await tx.select().from(assessment_offerings).where(eq(assessment_offerings.id,req.params.id)).for("update");if(!o?.assignment_id)throw notFound();await checkEvaluators(tx,b.evaluator_ids)
        const active=await tx.execute(sql`select e.evaluator_id from lms.evaluations e join lms.assignment_submissions s on s.id=e.submission_id where s.assignment_id=${o.assignment_id} and e.status='draft'`)
        if(active.rows.some(r=>r.evaluator_id&&!b.evaluator_ids.includes(String(r.evaluator_id))))throw conflict("An evaluator still owns an active review. Finish or release that review before removing the assignment.")
        await tx.delete(evaluator_assignments).where(eq(evaluator_assignments.assignment_id,o.assignment_id));await tx.insert(evaluator_assignments).values([...new Set(b.evaluator_ids)].map(evaluator_id=>({assignment_id:o.assignment_id!,evaluator_id})))
        await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"assessment.evaluators-assigned",target:o.id,outcome:b.reason});return {ok:true}})
    })
    scope.get<{Params:{id:string}}>("/offerings/:id/evaluators",async req=>{const [o]=await ctx.db.select().from(assessment_offerings).where(eq(assessment_offerings.id,req.params.id));if(!o?.assignment_id)throw notFound();return {assignments:await ctx.db.select().from(evaluator_assignments).where(eq(evaluator_assignments.assignment_id,o.assignment_id))}})
    scope.get("/policy",async req=>{const {context_key}=parse(z.object({context_key:z.string()}),req.query);const c=await resolveContext(ctx,context_key);return ctx.db.transaction(async tx=>({policy:await contextPolicy(tx,c),history:await tx.select().from(completion_policies).where(eq(completion_policies.context_key,c.context_key)).orderBy(desc(completion_policies.version))}))})
    scope.put("/policy",async req=>{const b=parse(z.object({context_key:z.string(),expected_version:z.number().int().positive(),rules:z.unknown()}),req.body);const c=await resolveContext(ctx,b.context_key);return {policy:await ctx.db.transaction(tx=>savePolicy(tx,me(req),c,b.rules,b.expected_version))}})
    scope.get<{Params:{id:string}}>("/courses/:id/credentials",async req=>({credentials:await ctx.db.select({credential:completion_credentials,student_name:users.full_name}).from(completion_credentials).innerJoin(users,eq(users.id,completion_credentials.student_id)).where(eq(completion_credentials.course_id,req.params.id)).orderBy(desc(completion_credentials.issued_at)).limit(1000)}))
    for(const action of ["revoke","reissue"] as const)scope.post<{Params:{id:string}}>(`/credentials/:id/${action}`,async req=>{const {reason}=parse(z.object({reason:z.string().trim().min(10).max(1000)}),req.body);return {credential:await ctx.db.transaction(tx=>action==="revoke"?revokeCredential(tx,me(req),req.params.id,reason):reissueCredential(tx,me(req),req.params.id,reason))}})
  },{prefix:"/api/admin/assessments"})
  await app.register(async scope=>{
    scope.addHook("preHandler",authenticate(ctx,["Student"]))
    scope.get("/assessment-offerings",async req=>({offerings:await studentOfferings(ctx.db,me(req).id)}))
    scope.get("/completion",async req=>{
      const {course_id}=parse(z.object({course_id:z.string().optional()}),req.query),contexts=await contextsFor(ctx.db,me(req).id,course_id),results=[]
      for(const c of contexts)results.push(await ctx.db.transaction(tx=>evaluateContext(tx,me(req).id,c)))
      return {results}
    })
    scope.post("/completion/check",async req=>{const b=parse(z.object({course_id:z.string().optional()}),req.body??{});return {results:await ctx.db.transaction(tx=>checkStudent(tx,me(req).id,b.course_id))}})
  },{prefix:"/api/student"})
}

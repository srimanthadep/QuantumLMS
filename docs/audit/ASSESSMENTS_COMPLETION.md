# Assessments and completion

The course workspace's **Assessments & completion** tab contains reusable quiz/assignment authoring, release to a batch or self-paced offer, evaluator allocation, versioned completion policies and credential review. Quiz answer keys remain server-side during attempts. Publishing rejects missing questions, out-of-range keys, invalid rubric levels and missing/inactive evaluators.

Each release creates a separate immutable quiz or assignment instance for the existing grading engines. Editing a reusable definition creates a new draft version; earlier releases retain their questions, answer keys, rubric and evaluation records. New evaluators receive a profile with no marking access. Administrators explicitly allocate them to assignments, and cannot remove an evaluator who owns an active review.

Batch offerings have fixed deadlines. Self-paced offerings can use fixed deadlines or a number of days from the learner's earliest enrollment grant for that offer. Current access must still be active. Students cannot start or submit another batch's assessment. Submission windows, quiz timers and attempt limits are enforced on the server. A new graded assignment attempt creates a new submission; earlier submissions and evaluations remain intact. Updating an ungraded submission retains the existing attempt number. Each offering's best released score counts for completion.

## Completion and credential policy

Defaults: all active lessons at 100%, every required assessment passed, minimum pass mark 40%, a live batch marked Completed after its end date, and attendance requirement 0%. Required lesson selection, percentage, assessment floor, batch-end requirement and attendance percentage are configurable per learning context. Attendance uses join clicks, not verified external-meeting presence. The offering's pass mark and policy floor both apply.

Lesson progress no longer issues credentials. Progress, released quiz/assignment grades, re-evaluation and batch completion enqueue durable checks. `COMPLETION_SWEEP_SECONDS=30` runs them using the existing API pool; 0 disables automatic checks. The student can also request **Check completion**, using exactly the same policy service. Course progress and grading share a transaction advisory lock with checks; context locks and unique constraints prevent duplicate credentials. Checks retry after errors and record the processed request version.

Completions retain their policy version, required lesson IDs, assessment scores, attendance basis and evaluation timestamp. Previously completed records remain unchanged when policies or curricula change. New credential identifiers are random and stable. Revocation requires an admin reason and makes public verification fail. Reissue requires explicit approval/reason, restored entitlement and a fresh successful check; it appends a completion revision and a new credential linked to the revoked one. Repeated reissue requests return that same replacement. A revoked credential is never automatically reissued by progress or a background check. Grade corrections after issuance require an administrator to review whether revocation is appropriate; they do not silently rewrite historical evidence.

## Migration and manual review

Apply reviewed migration **0013_assessment_completion** through the normal workflow after backup/review. It adds assessment, policy, completion, credential and queue tables. It adds submission attempt numbers (existing submissions become attempt 1) and replaces only the old uniqueness constraint with uniqueness per student, assignment and attempt. No submission, grade or certificate is deleted or rewritten.

Existing quizzes and assignments are explicitly marked `legacy`, without guessed batch or offer linkage. Their historical required/optional status is unknown, so the migration makes them optional for new completion checks. Review these records and release validated definitions in the appropriate batch/offer context before relying on required assessment enforcement for migrated cohorts. New offerings default to required. Existing earned certificates retain their original identifiers and dates, with an explicit note that their original completion policy is unavailable. A legacy credential without a policy snapshot cannot use automatic reissue: review the learner's entitlement and current policy, then run a new completion check. Legacy text-only grades are not treated as evidence for newly released offerings.

Only disposable test databases were migrated by the remediation runner. This phase does not infer historical attendance, payment or assessment context. Migration 0013 must be applied before opening these new UI panels. No provider account or production data was changed.

## Validation

`assessments-completion.test.ts` covers invalid grading configurations, role/allocation boundaries, frozen answer keys, exact-batch denial, failed required assessments, unfinished batch denial, attempt limits and preserved evaluations, concurrent checks, immutable policy snapshots, attendance gating, revoke/reissue idempotency, relative deadlines and durable completion recovery. Existing evaluator tests retain grading, review locks, release and re-evaluation coverage. The empty-install self-paced test now obtains its credential through the policy service without seeded content.

Typechecks and production builds cover the authoring and student UI. A visual walkthrough and real business-policy review remain manual; no visual verification is claimed.

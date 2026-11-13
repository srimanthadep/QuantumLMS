# Placement workflow

Migration **0014_placement_workflow** adds placement tracks, memberships, jobs, applications, status history and support-ticket links. No existing resume, interview, alumni story, grade or certificate is rewritten. A legacy certificate without a policy completion does not establish placement eligibility.

The completion-event worker reconciles canonical, non-revoked credentials. It creates one course track and one membership per qualifying learner, safely handling retries and out-of-order events. It runs after the completion sweep, using `COMPLETION_SWEEP_SECONDS` and the existing API connection pool. Defaults allow both live and self-paced completions, with automatic enrollment and an active track; administrators can change these fields in **Placements → Eligibility & tracks**. Changes also reconcile existing verified completions. A paused track stops new applications. Course playback expiry does not by itself revoke an earned credential or placement support; administrators can close support membership or revoke a credential with an audited reason.

Students use **Jobs & Applications** to browse roles available to their eligible tracks, review their saved resume and submit an application. The server reads the student's own saved resume, checks the version reviewed by the student and stores an immutable copy. Subsequent edits in the existing Resume Builder do not change submitted applications. Duplicate requests return the original application. Closing dates, track mode/active flags, membership status and credential revocation are enforced server-side.

Administrators assign active Support accounts as mentors. Support staff can manage job postings, but may read or update only applications belonging to their assigned learners. Reassignment takes effect on subsequent API calls. The application workflow is Submitted → Reviewing → Shortlisted → Interview → Offered → Placed, with Rejected/Withdrawn branches. Updates are version-checked, retain an event history and share their notes with the learner. Students can withdraw only their own nonterminal applications. No application is emailed to an employer automatically.

Placement help creates a real ticket in the existing support desk and links it to the membership/application. Parallel duplicate requests reuse an open ticket. Later messages are appended to that conversation. The general Support desk retains its existing ticket-triage access; submitted resumes and placement application details remain restricted to the assigned mentor and administrators. Resume building and interview practice remain the existing tools, accessible from the placement page.

## Manual setup

Apply migration 0014 after 0013. Keep the completion sweep enabled for automatic eligibility processing. Review the default track modes and support policy, assign mentors, and create/publish actual jobs. There is no invented employer inventory, placement outcome or historic completion backfill. New track configuration and jobs exist only after real completion or an explicit admin action. No production database or employer service was changed by this phase.

## Validation

`placement.test.ts` covers a completed live cohort becoming eligible, duplicate worker processing, explicit mentor assignment/reassignment, cross-user/mentor denial, resume ownership/version checks, concurrent duplicate applications, preserved resume snapshots, closing dates, status conflicts, complete placement progression, ticket reuse, credential revocation/reissue, out-of-order events, track flags/modes and denial of legacy-certificate-only eligibility. Production builds and typechecks cover the shared student/admin/support UI; a visual walkthrough remains manual.

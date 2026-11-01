-- Student portal behaviour: triggers that keep derived data consistent, RPCs for every write that needs a server-side
-- rule, and storage buckets. Functions run with an empty search_path and fully qualified names. RPCs are SECURITY
-- DEFINER and check the caller themselves; helpers live in app_private, which clients cannot reach.

-- ================================ Helpers ================================

-- The signed-in student's id, or an error for anyone without a profile.
create or replace function app_private.current_student() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from public.profiles where id = v) then
    raise exception 'Sign in as a student to continue' using errcode = '42501';
  end if;
  return v;
end $$;

-- Adds a notification unless the student switched that category off (notification_prefs ->> p_pref = 'false').
create or replace function app_private.notify(p_student uuid, p_kind text, p_title text, p_message text, p_link text default null, p_pref text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_pref is not null and exists (select 1 from public.profiles where id = p_student and notification_prefs ->> p_pref = 'false') then
    return;
  end if;
  insert into public.notifications (student_id, kind, title, message, link) values (p_student, p_kind, p_title, p_message, p_link);
end $$;

-- "Oct 22, 9:00 AM" in campus time, for messages.
create or replace function app_private.fmt_local(p_ts timestamptz) returns text
language sql stable set search_path = '' as $$
  select to_char(p_ts at time zone app_private.campus_tz(), 'Mon FMDD, FMHH12:MI AM')
$$;

-- Storage objects referenced by a row must exist and sit in the caller's own folder ("<uid>/...").
create or replace function app_private.assert_own_object(p_bucket text, p_path text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_path is null then return; end if;
  if split_part(p_path, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects o where o.bucket_id = p_bucket and o.name = p_path) then
    raise exception 'The attached file was not found. Upload it again.' using errcode = '22023';
  end if;
end $$;

alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^(https://|/assets/)');

-- ================================ Accounts ================================

-- Every new auth user gets a student profile, the starter courses and the first mentor. The configured demo email
-- gets the full demo history instead of a welcome note.
create or replace function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_email text := coalesce(new.email, '');
  v_name text := nullif(trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), '');
  v_avatar text := nullif(v_meta ->> 'avatar_url', '');
  v_demo boolean := v_email <> '' and lower(v_email) = lower(coalesce((select value #>> '{}' from app_private.settings where key = 'demo_email'), ''));
begin
  if v_name is null then
    v_name := initcap(nullif(trim(regexp_replace(split_part(v_email, '@', 1), '[._-]+', ' ', 'g')), ''));
  end if;
  if v_avatar is not null and v_avatar !~ '^(https://|/assets/)' then
    v_avatar := null;
  end if;
  insert into public.profiles (id, email, full_name, avatar_url, roll_number, mentor_id, is_demo)
  values (
    new.id, v_email, left(coalesce(v_name, 'Student'), 120), v_avatar,
    format('QAI-%s-%s', extract(year from now())::int, lpad(nextval('app_private.roll_number_seq')::text, 3, '0')),
    (select m.id from public.mentors m order by m.position limit 1),
    v_demo
  );
  insert into public.enrollments (student_id, course_id) select new.id, c.id from public.courses c where c.is_starter;
  if v_demo then
    perform app_private.seed_student_demo(new.id);
  else
    perform app_private.notify(new.id, 'system', 'Welcome to Quantum School',
      'Your courses for this term are ready. Start with the first lesson in My Courses.', 'courses');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app_private.handle_new_user();

create or replace function app_private.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return null;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function app_private.sync_profile_email();

-- The demo password is public, so nobody may change the demo account's password or email while demo_locked is true.
create or replace function app_private.protect_demo_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.encrypted_password is distinct from old.encrypted_password
      or new.email is distinct from old.email
      or coalesce(new.email_change, '') is distinct from coalesce(old.email_change, ''))
     and coalesce((select value from app_private.settings where key = 'demo_locked'), 'false'::jsonb) = 'true'::jsonb
     and exists (select 1 from public.profiles p where p.id = old.id and p.is_demo) then
    raise exception 'The shared demo account cannot change its password or email.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger protect_demo_user before update on auth.users for each row execute function app_private.protect_demo_user();

-- Nor may it add a second factor: that would lock every other visitor out of the shared account.
create or replace function app_private.protect_demo_mfa() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select value from app_private.settings where key = 'demo_locked'), 'false'::jsonb) = 'true'::jsonb
     and exists (select 1 from public.profiles p where p.id = new.user_id and p.is_demo) then
    raise exception 'The shared demo account cannot enable two-factor authentication.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger protect_demo_mfa before insert on auth.mfa_factors for each row execute function app_private.protect_demo_mfa();

-- ============================ Bookkeeping triggers ============================

create or replace function app_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger touch_updated_at before update on public.profiles for each row execute function app_private.touch_updated_at();
create trigger touch_updated_at before update on public.mentor_meetings for each row execute function app_private.touch_updated_at();
create trigger touch_updated_at before update on public.resumes for each row execute function app_private.touch_updated_at();

-- Pinning a note is not an edit; only content changes move "last modified".
create or replace function app_private.touch_note() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.title, new.course, new.content, new.snippet, new.tags, new.lesson)
     is distinct from (old.title, old.course, old.content, old.snippet, old.tags, old.lesson) then
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger touch_note before update on public.notes for each row execute function app_private.touch_note();

-- Enrolling opens the course's certificate as In Progress.
create or replace function app_private.on_enrollment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.certificates (student_id, course_id, title, course_title, skills, status)
  select new.student_id, c.id, c.certificate_title, c.title, c.certificate_skills, 'In Progress'
  from public.courses c where c.id = new.course_id and c.certificate_title is not null
  on conflict (student_id, course_id) do nothing;
  return null;
end $$;
create trigger on_enrollment after insert on public.enrollments for each row execute function app_private.on_enrollment();

-- Community authors come from the caller's profile, so they can't be forged. Runs as the invoker: for direct client
-- inserts (role authenticated) it fills the author; inserts made by seed functions keep the authors they set.
create or replace function app_private.fill_author() returns trigger
language plpgsql set search_path = '' as $$
declare p record;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  select id, full_name, avatar_url into p from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Only students can post' using errcode = '42501';
  end if;
  new.author_id := p.id;
  new.author_name := p.full_name;
  new.author_avatar := p.avatar_url;
  new.created_at := now();
  return new;
end $$;
create trigger fill_author before insert on public.community_posts for each row execute function app_private.fill_author();
create trigger fill_author before insert on public.post_replies for each row execute function app_private.fill_author();
create trigger fill_author before insert on public.course_questions for each row execute function app_private.fill_author();

-- Counters shown in the community feed, course Q&A and squads. Other students' likes are invisible under RLS, so the
-- totals are kept on the parent rows.
create or replace function app_private.count_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.community_posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger count_post_like after insert or delete on public.post_likes for each row execute function app_private.count_post_like();

create or replace function app_private.count_post_reply() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set reply_count = reply_count + 1 where id = new.post_id;
  else
    update public.community_posts set reply_count = greatest(0, reply_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger count_post_reply after insert or delete on public.post_replies for each row execute function app_private.count_post_reply();

create or replace function app_private.count_question_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.course_questions set vote_count = vote_count + 1 where id = new.question_id;
  else
    update public.course_questions set vote_count = greatest(0, vote_count - 1) where id = old.question_id;
  end if;
  return null;
end $$;
create trigger count_question_vote after insert or delete on public.course_question_votes for each row execute function app_private.count_question_vote();

create or replace function app_private.count_squad_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.study_squads set member_count = member_count + 1 where id = new.squad_id;
  else
    update public.study_squads set member_count = greatest(0, member_count - 1) where id = old.squad_id;
  end if;
  return null;
end $$;
create trigger count_squad_member after insert or delete on public.squad_members for each row execute function app_private.count_squad_member();

-- ================================ Courses ================================

-- Issues the course certificate once every lesson is complete. Returns the certificate when newly earned.
create or replace function app_private.issue_certificate(p_student uuid, p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.courses;
  v_grade text;
  v_cert public.certificates;
begin
  select * into c from public.courses where id = p_course;
  if not found or c.certificate_title is null then
    return null;
  end if;
  if exists (select 1 from public.certificates where student_id = p_student and course_id = p_course and status = 'Earned') then
    return null;
  end if;
  select 'Grade: ' || g.letter_grade || case when g.letter_grade = 'A+' then ' (Honors)' else '' end into v_grade
  from public.grades g where g.student_id = p_student and g.course_code = c.code order by g.position limit 1;
  insert into public.certificates (student_id, course_id, title, course_title, skills, status, issued_at, credential_id, grade)
  values (
    p_student, c.id, c.certificate_title, c.title, c.certificate_skills, 'Earned', now(),
    -- Random, so credentials can't be enumerated through the public verification function.
    format('QAI-%s-%s', upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), upper(split_part(c.code, '-', 1))),
    coalesce(v_grade, 'Completed')
  )
  on conflict (student_id, course_id) do update set
    status = 'Earned', issued_at = excluded.issued_at, credential_id = excluded.credential_id, grade = excluded.grade,
    title = excluded.title, course_title = excluded.course_title, skills = excluded.skills
  returning * into v_cert;
  perform app_private.notify(p_student, 'grade', 'Certificate earned',
    format('You completed %s. "%s" is ready to share.', c.title, c.certificate_title), 'certificates', 'grades');
  return to_jsonb(v_cert);
end $$;

-- Marks a lesson complete (or not), logs study time for today and issues the certificate when the course is done.
create or replace function public.set_lesson_complete(p_lesson_id text, p_done boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app_private.current_student();
  v_today date := app_private.local_today();
  l public.lessons;
  v_removed public.lesson_progress;
  v_total int;
  v_done int;
  v_cert jsonb;
begin
  select * into l from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'Lesson not found' using errcode = 'PT404';
  end if;
  if not exists (select 1 from public.enrollments where student_id = v_uid and course_id = l.course_id) then
    raise exception 'Enroll in the course to track your progress' using errcode = '42501';
  end if;
  if p_done then
    insert into public.lesson_progress (student_id, lesson_id, course_id) values (v_uid, l.id, l.course_id) on conflict do nothing;
    if found then
      insert into public.study_activity (student_id, day, minutes, lessons) values (v_uid, v_today, l.minutes, 1)
      on conflict (student_id, day) do update set minutes = public.study_activity.minutes + excluded.minutes, lessons = public.study_activity.lessons + 1;
    end if;
  else
    delete from public.lesson_progress where student_id = v_uid and lesson_id = l.id returning * into v_removed;
    -- Undoing a lesson completed today takes its minutes back off today's total.
    if v_removed.lesson_id is not null and (v_removed.completed_at at time zone app_private.campus_tz())::date = v_today then
      update public.study_activity set minutes = greatest(0, minutes - l.minutes), lessons = greatest(0, lessons - 1)
      where student_id = v_uid and day = v_today;
    end if;
  end if;
  select count(*) into v_total from public.lessons where course_id = l.course_id;
  select count(*) into v_done from public.lesson_progress where student_id = v_uid and course_id = l.course_id;
  if v_total > 0 and v_done = v_total then
    v_cert := app_private.issue_certificate(v_uid, l.course_id);
  end if;
  return jsonb_build_object('course_id', l.course_id, 'completed', v_done, 'total', v_total, 'certificate', v_cert);
end $$;

-- ================================ Assignments ================================

create or replace function public.submit_assignment(
  p_assignment_id text,
  p_repo_url text default null,
  p_comments text default null,
  p_file_path text default null,
  p_file_name text default null,
  p_file_size text default null
) returns public.assignment_submissions
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app_private.current_student();
  a public.assignments;
  v_prev public.assignment_submissions;
  v_repo text := nullif(trim(coalesce(p_repo_url, '')), '');
  v_comments text := nullif(trim(coalesce(p_comments, '')), '');
  v_row public.assignment_submissions;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    raise exception 'Assignment not found' using errcode = 'PT404';
  end if;
  if not exists (select 1 from public.enrollments where student_id = v_uid and course_id = a.course_id) then
    raise exception 'Enroll in the course to submit this assignment' using errcode = '42501';
  end if;
  select * into v_prev from public.assignment_submissions where student_id = v_uid and assignment_id = a.id;
  if v_prev.status = 'Graded' then
    raise exception 'This assignment has already been graded' using errcode = 'P0001';
  end if;
  if v_repo is not null and v_repo !~ '^https://(www\.)?github\.com/[^/\s]+/[^/\s]+' then
    raise exception 'Use a GitHub link like https://github.com/you/project' using errcode = '22023';
  end if;
  if char_length(coalesce(v_comments, '')) > 4000 then
    raise exception 'Keep notes for the evaluator under 4,000 characters' using errcode = '22023';
  end if;
  perform app_private.assert_own_object('submissions', p_file_path);
  if v_repo is null and p_file_path is null and v_prev.file_path is null then
    raise exception 'Add a repository link or attach a file' using errcode = '22023';
  end if;
  -- A resubmission replaces the link and notes; the earlier file stays unless a new one is attached.
  insert into public.assignment_submissions (student_id, assignment_id, repo_url, comments, file_path, file_name, file_size, submitted_at)
  values (v_uid, a.id, v_repo, v_comments, p_file_path, left(p_file_name, 200), left(p_file_size, 40), now())
  on conflict (student_id, assignment_id) do update set
    repo_url = excluded.repo_url,
    comments = excluded.comments,
    file_path = coalesce(excluded.file_path, public.assignment_submissions.file_path),
    file_name = case when excluded.file_path is null then public.assignment_submissions.file_name else excluded.file_name end,
    file_size = case when excluded.file_path is null then public.assignment_submissions.file_size else excluded.file_size end,
    status = 'Submitted',
    submitted_at = now()
  returning * into v_row;
  perform app_private.notify(v_uid, 'assessment', 'Submission received', format('%s was submitted for evaluation.', a.title), 'assessments');
  return v_row;
end $$;

-- ================================ Quizzes ================================
-- Correct answers stay in quiz_questions (no client privileges). Students get questions without answers from
-- start_quiz, answers are saved as they go, and grading happens here on submit or when the deadline passes.

-- Keeps only answers for real questions with an option index in range.
create or replace function app_private.clean_answers(p_quiz text, p_answers jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, (e.value #>> '{}')::int), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end) e
  join public.quiz_questions qq on qq.quiz_id = p_quiz and (qq.position - 1)::text = e.key
  where jsonb_typeof(e.value) = 'number'
    and case when (e.value #>> '{}') ~ '^[0-9]{1,2}$' then (e.value #>> '{}')::int < cardinality(qq.options) else false end
$$;

create or replace function app_private.grade_attempt(p_attempt text, p_notify boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.quiz_attempts;
  q public.quizzes;
  v_score int;
  v_max int;
  v_pct int;
  v_end timestamptz;
begin
  select * into a from public.quiz_attempts where id = p_attempt for update;
  if not found or a.submitted_at is not null then
    return;
  end if;
  select * into q from public.quizzes where id = a.quiz_id;
  select count(*) filter (where a.answers ->> (qq.position - 1)::text = qq.correct_index::text), count(*)
  into v_score, v_max from public.quiz_questions qq where qq.quiz_id = a.quiz_id;
  v_max := greatest(v_max, 1);
  v_pct := round(v_score * 100.0 / v_max);
  v_end := least(now(), a.deadline_at);
  update public.quiz_attempts set
    submitted_at = v_end,
    time_taken_seconds = greatest(1, ceil(extract(epoch from v_end - a.started_at))::int),
    score = v_score, max_score = v_max, pct = v_pct, passed = v_pct >= q.passing_pct,
    feedback = case when v_pct >= q.passing_pct
      then 'Strong work. Review the explanations below to lock in the concepts you missed.'
      else format('You need %s%% to pass. Revisit the module material, then review each explanation below.', q.passing_pct) end
  where id = a.id;
  if p_notify then
    perform app_private.notify(a.student_id, 'assessment', 'Quiz graded', format('%s · %s/%s (%s%%)', q.title, v_score, v_max, v_pct), 'quizzes', 'grades');
  end if;
end $$;

-- Grades open attempts whose deadline passed more than 30 seconds ago (the grace period for the final submit).
create or replace function app_private.finalize_expired_attempts(p_student uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.quiz_attempts
    where submitted_at is null and deadline_at < now() - interval '30 seconds' and (p_student is null or student_id = p_student)
  loop
    perform app_private.grade_attempt(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Questions (never answers) plus the attempt's id, deadline and saved answers. Resumes an open attempt.
create or replace function app_private.attempt_payload(a public.quiz_attempts) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attempt_id', a.id, 'attempt_number', a.attempt_number, 'started_at', a.started_at, 'deadline_at', a.deadline_at,
    -- The client runs its countdown from server_now so a skewed device clock can't shorten or stretch the quiz.
    'server_now', now(), 'answers', a.answers,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('position', qq.position, 'question', qq.question, 'options', to_jsonb(qq.options),
                                          'topic', qq.topic, 'difficulty', qq.difficulty) order by qq.position)
      from public.quiz_questions qq where qq.quiz_id = a.quiz_id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.start_quiz(p_quiz_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app_private.current_student();
  q public.quizzes;
  a public.quiz_attempts;
  v_used int;
begin
  select * into q from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Quiz not found' using errcode = 'PT404';
  end if;
  if not exists (select 1 from public.enrollments where student_id = v_uid and course_id = q.course_id) then
    raise exception 'Enroll in the course to take this quiz' using errcode = '42501';
  end if;
  perform app_private.finalize_expired_attempts(v_uid);
  select * into a from public.quiz_attempts where student_id = v_uid and quiz_id = q.id and submitted_at is null;
  if found then
    return app_private.attempt_payload(a);
  end if;
  if q.available_from is not null and now() < q.available_from then
    raise exception 'This quiz opens on %', app_private.fmt_local(q.available_from) using errcode = 'P0001';
  end if;
  if now() > q.due_at then
    raise exception 'This quiz closed on %', app_private.fmt_local(q.due_at) using errcode = 'P0001';
  end if;
  select count(*) into v_used from public.quiz_attempts where student_id = v_uid and quiz_id = q.id;
  if v_used >= q.max_attempts then
    raise exception 'You have used all % attempt(s) for this quiz', q.max_attempts using errcode = 'P0001';
  end if;
  insert into public.quiz_attempts (student_id, quiz_id, attempt_number, started_at, deadline_at)
  values (v_uid, q.id, v_used + 1, now(), least(now() + make_interval(mins => q.duration_minutes), q.due_at))
  returning * into a;
  return app_private.attempt_payload(a);
end $$;

create or replace function app_private.open_attempt(p_attempt text) returns public.quiz_attempts
language plpgsql security definer set search_path = '' as $$
declare a public.quiz_attempts;
begin
  select * into a from public.quiz_attempts where id = p_attempt and student_id = app_private.current_student() for update;
  if not found then
    raise exception 'Quiz attempt not found' using errcode = 'PT404';
  end if;
  return a;
end $$;

-- Autosave while the timer runs. Ignored once the attempt is graded or past its deadline.
create or replace function public.save_quiz_answers(p_attempt_id text, p_answers jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.quiz_attempts := app_private.open_attempt(p_attempt_id);
begin
  if a.submitted_at is null and now() <= a.deadline_at + interval '30 seconds' then
    update public.quiz_attempts set answers = app_private.clean_answers(a.quiz_id, p_answers) where id = a.id;
  end if;
end $$;

-- Review of a graded attempt: the student's answers with the correct option and explanation for each question.
create or replace function public.get_quiz_review(p_attempt_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.quiz_attempts := app_private.open_attempt(p_attempt_id);
begin
  if a.submitted_at is null then
    raise exception 'Submit the quiz to see the answers' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'attempt', to_jsonb(a) - 'student_id',
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('position', qq.position, 'question', qq.question, 'options', to_jsonb(qq.options),
                                          'correct_index', qq.correct_index, 'explanation', qq.explanation,
                                          'topic', qq.topic, 'difficulty', qq.difficulty) order by qq.position)
      from public.quiz_questions qq where qq.quiz_id = a.quiz_id
    ), '[]'::jsonb)
  );
end $$;

-- Final submit. Answers sent within the grace period replace the autosaved ones; later ones are ignored.
create or replace function public.submit_quiz(p_attempt_id text, p_answers jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.quiz_attempts := app_private.open_attempt(p_attempt_id);
begin
  if a.submitted_at is null then
    if p_answers is not null and now() <= a.deadline_at + interval '30 seconds' then
      update public.quiz_attempts set answers = app_private.clean_answers(a.quiz_id, p_answers) where id = a.id;
    end if;
    perform app_private.grade_attempt(a.id);
  end if;
  return public.get_quiz_review(a.id);
end $$;

-- Grades the caller's attempts that ran out of time while they were away.
create or replace function public.sync_my_quizzes() returns int
language sql security definer set search_path = '' as $$
  select app_private.finalize_expired_attempts(app_private.current_student())
$$;

-- ================================ Support ================================

create or replace function public.create_support_ticket(
  p_category text,
  p_subject text,
  p_description text,
  p_priority text,
  p_attachment_name text default null,
  p_attachment_size text default null,
  p_attachment_path text default null
) returns public.support_tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app_private.current_student();
  p public.profiles;
  t public.support_tickets;
begin
  if char_length(trim(coalesce(p_subject, ''))) < 8 then
    raise exception 'Summarise the issue in at least 8 characters.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_description, ''))) < 20 then
    raise exception 'Describe what happened in at least 20 characters.' using errcode = '22023';
  end if;
  if p_priority is null or p_priority not in ('Low', 'Medium', 'High', 'Urgent') then
    raise exception 'Choose a priority' using errcode = '22023';
  end if;
  perform app_private.assert_own_object('ticket-attachments', p_attachment_path);
  select * into p from public.profiles where id = v_uid;
  insert into public.support_tickets (id, student_id, category, subject, description, priority, attachment_name, attachment_size, attachment_path)
  values ('TKT-' || nextval('app_private.ticket_number_seq'), v_uid, left(trim(coalesce(p_category, 'Other')), 80), left(trim(p_subject), 200),
          left(trim(p_description), 5000), p_priority, left(p_attachment_name, 200), left(p_attachment_size, 40), p_attachment_path)
  returning * into t;
  -- The description opens the conversation, as the first message from the student.
  insert into public.ticket_replies (ticket_id, author_id, author_name, author_role, author_avatar, content, attachment_name, attachment_path)
  values (t.id, v_uid, p.full_name, 'Student', p.avatar_url, t.description, t.attachment_name, t.attachment_path);
  perform app_private.notify(v_uid, 'system', format('Ticket %s created', t.id), format('%s. We''ll reply soon.', t.subject), 'support');
  return t;
end $$;

create or replace function app_private.own_ticket(p_ticket text) returns public.support_tickets
language plpgsql security definer set search_path = '' as $$
declare t public.support_tickets;
begin
  select * into t from public.support_tickets where id = p_ticket and student_id = app_private.current_student() for update;
  if not found then
    raise exception 'Ticket not found' using errcode = 'PT404';
  end if;
  return t;
end $$;

-- A reply on a resolved or closed ticket reopens it.
create or replace function public.reply_to_support_ticket(p_ticket_id text, p_content text, p_attachment_name text default null, p_attachment_path text default null)
returns public.ticket_replies
language plpgsql security definer set search_path = '' as $$
declare
  t public.support_tickets := app_private.own_ticket(p_ticket_id);
  p public.profiles;
  r public.ticket_replies;
begin
  if char_length(trim(coalesce(p_content, ''))) = 0 or char_length(p_content) > 5000 then
    raise exception 'Write a reply of up to 5,000 characters' using errcode = '22023';
  end if;
  perform app_private.assert_own_object('ticket-attachments', p_attachment_path);
  select * into p from public.profiles where id = t.student_id;
  insert into public.ticket_replies (ticket_id, author_id, author_name, author_role, author_avatar, content, attachment_name, attachment_path)
  values (t.id, t.student_id, p.full_name, 'Student', p.avatar_url, trim(p_content), left(p_attachment_name, 200), p_attachment_path)
  returning * into r;
  update public.support_tickets set
    status = case when status in ('Resolved', 'Closed') then 'Open' else status end,
    last_update_by = 'You', updated_at = now()
  where id = t.id;
  return r;
end $$;

-- Students can mark their ticket resolved, or reopen a resolved or closed one. Staff statuses are not theirs to set.
create or replace function public.set_support_ticket_status(p_ticket_id text, p_status text) returns public.support_tickets
language plpgsql security definer set search_path = '' as $$
declare t public.support_tickets := app_private.own_ticket(p_ticket_id);
begin
  if p_status = 'Resolved' and t.status in ('Open', 'In Progress') then
    update public.support_tickets set status = 'Resolved', last_update_by = 'You', updated_at = now() where id = t.id returning * into t;
  elsif p_status = 'Open' and t.status in ('Resolved', 'Closed') then
    update public.support_tickets set status = 'Open', last_update_by = 'You', updated_at = now() where id = t.id returning * into t;
  elsif p_status is distinct from t.status then
    raise exception 'A % ticket cannot be set to %', lower(t.status), coalesce(p_status, 'nothing') using errcode = '22023';
  end if;
  return t;
end $$;

-- Live chat: stores the student's message and the Learner Success reply (keyword routing, as in the old client).
create or replace function app_private.agent_reply(p_text text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_text ~* '(gpu|cluster|quota)' then 'For GPU quota, I can raise a priority request with DevOps. Could you share your namespace and the hours you need?'
    when p_text ~* '(attend|leave|absent)' then 'You can request leave from Schedule → Attendance. If it''s medical, attach the slip and Academic Affairs will mark it excused.'
    when p_text ~* '(assign|submit|deadline)' then 'Submissions can be updated until the deadline from the Assessments page. Want me to check an extension for you?'
    when p_text ~* '(certificate|transcript)' then 'Certificates and the PDF transcript are under Grades & Certificates. Each has a verification link you can share.'
    else 'Thanks! I''m looking into it now. Could you share a little more detail so I can route this to the right team?'
  end
$$;

create or replace function public.send_support_chat_message(p_body text) returns setof public.support_chat_messages
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app_private.current_student();
  v_body text := trim(coalesce(p_body, ''));
begin
  if char_length(v_body) = 0 or char_length(v_body) > 2000 then
    raise exception 'Write a message of up to 2,000 characters' using errcode = '22023';
  end if;
  return query
    insert into public.support_chat_messages (student_id, sender, body)
    values (v_uid, 'student', v_body), (v_uid, 'agent', app_private.agent_reply(v_body))
    returning *;
end $$;

-- ================================ Mentorship ================================

-- Books (or moves) the caller's meeting with a mentor: weekdays in the next 60 days, 45 minutes from the chosen slot.
create or replace function public.book_mentor_meeting(p_mentor_id text, p_date date, p_slot text, p_topic text, p_agenda text default null)
returns public.mentor_meetings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := app_private.current_student();
  v_today date := app_private.local_today();
  m public.mentors;
  v_start time;
  v_row public.mentor_meetings;
begin
  select * into m from public.mentors where id = p_mentor_id;
  if not found then
    raise exception 'Mentor not found' using errcode = 'PT404';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 60 then
    raise exception 'Pick a date within the next 60 days' using errcode = '22023';
  end if;
  if extract(isodow from p_date) > 5 then
    raise exception 'Mentors meet on weekdays only' using errcode = '22023';
  end if;
  if p_slot is null or p_slot !~ '^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$' then
    raise exception 'Pick a time slot' using errcode = '22023';
  end if;
  v_start := p_slot::time;
  if app_private.local_ts(p_date, v_start) < now() then
    raise exception 'That time has already passed' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_topic, ''))) not between 2 and 80 or char_length(coalesce(p_agenda, '')) > 2000 then
    raise exception 'Add a topic (and an agenda under 2,000 characters)' using errcode = '22023';
  end if;
  begin
    insert into public.mentor_meetings (student_id, mentor_id, meeting_date, slot, ends_slot, topic, agenda, zoom_url, status)
    values (v_uid, m.id, p_date, p_slot, to_char(v_start + interval '45 minutes', 'HH12:MI AM'), trim(p_topic),
            nullif(trim(coalesce(p_agenda, '')), ''), m.zoom_url, 'Scheduled')
    on conflict (student_id, mentor_id) do update set
      meeting_date = excluded.meeting_date, slot = excluded.slot, ends_slot = excluded.ends_slot, topic = excluded.topic,
      agenda = excluded.agenda, zoom_url = excluded.zoom_url, status = 'Scheduled'
    returning * into v_row;
  exception when unique_violation then
    raise exception 'That slot was just booked by another student. Pick another time.' using errcode = 'P0001';
  end;
  perform app_private.notify(v_uid, 'class', 'Mentor meeting booked',
    format('%s with %s on %s at %s', v_row.topic, m.name, to_char(p_date, 'Dy, Mon FMDD'), p_slot), 'mentorship', 'live');
  return v_row;
end $$;

create or replace function public.cancel_mentor_meeting(p_mentor_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.mentor_meetings set status = 'Cancelled'
  where student_id = app_private.current_student() and mentor_id = p_mentor_id and status = 'Scheduled';
end $$;

-- ============================ Credential check ============================

-- Public verification of an earned certificate (the link students share). Anyone with the credential id sees the
-- recipient's name and what they earned; nothing else about the student.
create or replace function public.verify_certificate(p_credential_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'credential_id', c.credential_id, 'title', c.title, 'course_title', c.course_title, 'issued_at', c.issued_at,
    'grade', c.grade, 'skills', to_jsonb(c.skills), 'recipient', p.full_name
  )
  from public.certificates c join public.profiles p on p.id = c.student_id
  where c.credential_id = p_credential_id and c.status = 'Earned'
$$;

-- ================================ Demo ================================

-- Restores the shared demo student's history and moves the demo calendar to today.
create or replace function public.reset_my_demo_data() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := app_private.current_student();
begin
  if not exists (select 1 from public.profiles where id = v_uid and is_demo) then
    raise exception 'Only the shared demo account can be reset' using errcode = '42501';
  end if;
  perform app_private.seed_content(now());
  perform app_private.seed_student_demo(v_uid);
end $$;

-- ================================ Storage ================================
-- Objects live under "<user id>/..." in each bucket. Avatars are public images; submissions and ticket attachments are
-- private and can be added but not replaced or removed (they are evidence of what was handed in).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('submissions', 'submissions', false, 52428800, null),
  ('ticket-attachments', 'ticket-attachments', false, 10485760, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  b text;
  own text;
begin
  foreach b in array array['avatars', 'submissions', 'ticket-attachments'] loop
    own := format('bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text', b);
    execute format('create policy %I on storage.objects for select to authenticated using (%s)', 'Students read their own ' || b, own);
    execute format('create policy %I on storage.objects for insert to authenticated with check (%s)', 'Students upload their own ' || b, own);
  end loop;
  execute format('create policy %I on storage.objects for update to authenticated using (%s) with check (%s)', 'Students replace their own avatars',
    'bucket_id = ''avatars'' and (storage.foldername(name))[1] = (select auth.uid())::text', 'bucket_id = ''avatars'' and (storage.foldername(name))[1] = (select auth.uid())::text');
  execute format('create policy %I on storage.objects for delete to authenticated using (%s)', 'Students delete their own avatars',
    'bucket_id = ''avatars'' and (storage.foldername(name))[1] = (select auth.uid())::text');
end $$;

-- ================================ Privileges ================================

revoke execute on all functions in schema app_private from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.set_lesson_complete(text, boolean),
  public.submit_assignment(text, text, text, text, text, text),
  public.start_quiz(text),
  public.save_quiz_answers(text, jsonb),
  public.get_quiz_review(text),
  public.submit_quiz(text, jsonb),
  public.sync_my_quizzes(),
  public.create_support_ticket(text, text, text, text, text, text, text),
  public.reply_to_support_ticket(text, text, text, text),
  public.set_support_ticket_status(text, text),
  public.send_support_chat_message(text),
  public.book_mentor_meeting(text, date, text, text, text),
  public.cancel_mentor_meeting(text),
  public.reset_my_demo_data()
to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ================================ Scheduled jobs ================================
-- Grade quiz attempts that ran out of time while the student was away. Without pg_cron the same happens lazily in
-- start_quiz and sync_my_quizzes.
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('finalize-quiz-attempts', '* * * * *', 'select app_private.finalize_expired_attempts()');
exception when others then
  raise notice 'pg_cron unavailable (%); expired quiz attempts are graded on the next visit instead', sqlerrm;
end $$;

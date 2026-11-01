-- Student portal schema: shared course content, per-student state, privileges and row-level security.
-- Every table in `public` has RLS enabled. Students only ever see their own rows; shared content is read-only.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

-- Small key/value store for backend settings (demo calendar anchor, campus time zone).
create table app_private.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app_private.settings (key, value) values
  ('timezone', '"Asia/Kolkata"'),
  ('demo_anchor', to_jsonb(now())),
  ('demo_email', '"aarav.mehta@learner.ai"'),
  -- While true, the shared demo account cannot change its password or email (see protect_demo_user).
  ('demo_locked', 'true');

create sequence app_private.roll_number_seq start 100;
create sequence app_private.ticket_number_seq start 92146;

-- Campus time zone; timetable times and seeded dates are campus-local.
create or replace function app_private.campus_tz() returns text
language sql stable set search_path = '' as $$
  select coalesce((select value #>> '{}' from app_private.settings where key = 'timezone'), 'UTC')
$$;

-- Campus-local "today" (all seeded dates and study streaks use it).
create or replace function app_private.local_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone app_private.campus_tz())::date
$$;

-- Campus-local date + time as a timestamp.
create or replace function app_private.local_ts(p_day date, p_time time) returns timestamptz
language sql stable set search_path = '' as $$
  select (p_day + p_time) at time zone app_private.campus_tz()
$$;

-- ============================== Shared content ==============================

create table public.courses (
  id text primary key,
  code text not null unique,
  title text not null,
  category text not null,
  image text not null default '',
  instructor text not null,
  instructor_role text not null default '',
  description text not null default '',
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  credits int not null default 0 check (credits >= 0),
  duration text not null default '',
  rating text not null default '',
  reviews text not null default '',
  progress_color text not null default '',
  -- Certificate issued when every lesson is complete (null: the course has no certificate).
  certificate_title text,
  certificate_skills text[] not null default '{}',
  -- New students are enrolled in starter courses when they sign up.
  is_starter boolean not null default false,
  position int not null default 0
);

create table public.course_modules (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  position int not null,
  title text not null,
  duration text not null default '',
  unique (course_id, position)
);

create table public.lessons (
  id text primary key,
  module_id text not null references public.course_modules (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  position int not null,
  title text not null,
  duration text not null default '',
  minutes int not null default 0 check (minutes >= 0),
  type text not null check (type in ('video', 'reading', 'lab')),
  summary text not null default '',
  unique (course_id, position)
);
create index lessons_module_idx on public.lessons (module_id);

create table public.course_materials (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  position int not null default 0,
  title text not null,
  type text not null check (type in ('PDF', 'Code Notebook', 'Dataset', 'Slides')),
  size text not null default '',
  published_at timestamptz,
  description text not null default '',
  file_name text,
  url text,
  drive_url text,
  drive_id text,
  is_available boolean not null default true,
  error_message text,
  content text,
  mime_type text
);
create index course_materials_course_idx on public.course_materials (course_id, position);

create table public.assignments (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  max_marks int not null default 100 check (max_marks > 0),
  priority text not null default 'Normal' check (priority in ('High', 'Medium', 'Normal')),
  due_at timestamptz not null
);
create index assignments_course_idx on public.assignments (course_id);

create table public.quizzes (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  duration_minutes int not null check (duration_minutes > 0),
  passing_pct int not null check (passing_pct between 0 and 100),
  max_attempts int not null default 1 check (max_attempts > 0),
  question_count int not null default 0,
  available_from timestamptz,
  due_at timestamptz not null
);
create index quizzes_course_idx on public.quizzes (course_id);

-- Correct answers live here. Students have no privileges on this table; questions reach them only through RPCs.
create table public.quiz_questions (
  quiz_id text not null references public.quizzes (id) on delete cascade,
  position int not null check (position > 0),
  question text not null,
  options text[] not null check (cardinality(options) between 2 and 6),
  correct_index int not null,
  explanation text not null default '',
  topic text,
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')),
  primary key (quiz_id, position),
  check (correct_index >= 0 and correct_index < cardinality(options))
);

create table public.timetable_slots (
  id text primary key,
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  starts time not null,
  ends time not null check (ends > starts),
  course_code text not null,
  course_id text references public.courses (id) on delete set null,
  title text not null,
  instructor text not null,
  room text not null,
  is_online boolean not null default false
);

create table public.campus_events (
  id text primary key,
  title text not null,
  category text not null check (category in ('Hackathons', 'Guest Lectures', 'Workshops', 'Academic')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  time_label text not null default '',
  location text not null default '',
  speaker text,
  is_featured boolean not null default false,
  description text not null default ''
);

create table public.announcements (
  id text primary key,
  title text not null,
  author text not null,
  department text not null default '',
  category text not null check (category in ('Urgent', 'Academic', 'Infrastructure', 'General')),
  content text not null,
  attachment_name text,
  attachment_size text,
  published_at timestamptz not null
);

create table public.faqs (
  id text primary key,
  category text not null,
  question text not null,
  answer text not null,
  link_target text,
  link_label text,
  position int not null default 0
);

create table public.mentors (
  id text primary key,
  name text not null,
  avatar text not null default '',
  title text not null,
  department text not null default '',
  email text not null,
  phone text not null default '',
  office text not null default '',
  bio text not null default '',
  specializations text[] not null default '{}',
  office_hours text not null default '',
  availability text not null default 'Available Now' check (availability in ('Available Now', 'In Lecture', 'Away')),
  zoom_url text,
  position int not null default 0
);

-- Shown member count = base_members (members outside the app) + member_count (kept by a trigger on squad_members).
create table public.study_squads (
  id text primary key,
  name text not null,
  base_members int not null default 0 check (base_members >= 0),
  member_count int not null default 0 check (member_count >= 0),
  next_session text not null default '',
  position int not null default 0
);

-- ================================ Profiles ================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  avatar_url text,
  headline text not null default 'Learner',
  roll_number text not null unique,
  phone text not null default '' check (char_length(phone) <= 40),
  location text not null default '' check (char_length(location) <= 120),
  bio text not null default '' check (char_length(bio) <= 200),
  program text not null default 'Bachelor of Science in Artificial Intelligence',
  batch text not null default 'Class of 2027 · Year 4',
  department text not null default 'School of Computing & Machine Intelligence',
  gpa text not null default '–',
  credits_completed int not null default 0,
  total_credits int not null default 60,
  campus_address text not null default '',
  emergency_contact text not null default '',
  mentor_id text references public.mentors (id) on delete set null,
  notification_prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(notification_prefs) = 'object'),
  quiet_hours text not null default '22-07' check (quiet_hours ~ '^(off|[0-9]{2}-[0-9]{2})$'),
  ui_state jsonb not null default '{}'::jsonb check (jsonb_typeof(ui_state) = 'object' and pg_column_size(ui_state) < 8192),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================ Per-student state ============================
-- student_id defaults to the caller, so clients never send it; RLS checks it on every row.

create table public.enrollments (
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

create table public.lesson_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress (student_id, course_id);

create table public.study_activity (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  minutes int not null default 0 check (minutes >= 0),
  lessons int not null default 0 check (lessons >= 0),
  primary key (student_id, day)
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  assignment_id text not null references public.assignments (id) on delete cascade,
  status text not null default 'Submitted' check (status in ('Submitted', 'Graded')),
  repo_url text,
  comments text check (char_length(comments) <= 4000),
  file_path text,
  file_name text,
  file_size text,
  submitted_at timestamptz not null default now(),
  score int check (score >= 0),
  grade text,
  feedback text,
  graded_at timestamptz,
  unique (student_id, assignment_id)
);

-- An attempt starts in progress (submitted_at null) with a server-side deadline; it is graded in SQL on submit,
-- or automatically once the deadline passes. answers maps question index ("0".."n-1") to the chosen option.
create table public.quiz_attempts (
  id text primary key default ('att-' || replace(gen_random_uuid()::text, '-', '')),
  student_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id text not null references public.quizzes (id) on delete cascade,
  attempt_number int not null check (attempt_number > 0),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  time_taken_seconds int check (time_taken_seconds > 0),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  score int check (score >= 0),
  max_score int check (max_score > 0),
  pct int check (pct between 0 and 100),
  passed boolean,
  feedback text,
  unique (student_id, quiz_id, attempt_number),
  check (
    (submitted_at is null and score is null and pct is null and passed is null)
    or (submitted_at is not null and score is not null and max_score is not null and pct is not null and passed is not null and time_taken_seconds is not null)
  )
);
create unique index quiz_attempts_one_open_idx on public.quiz_attempts (student_id, quiz_id) where submitted_at is null;
create index quiz_attempts_open_deadline_idx on public.quiz_attempts (deadline_at) where submitted_at is null;

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_code text not null,
  course_title text not null,
  credits int not null,
  midterm numeric(5, 1) not null,
  assignments numeric(5, 1) not null,
  final_exam numeric(5, 1) not null,
  total_score numeric(5, 1) not null,
  letter_grade text not null check (letter_grade in ('A+', 'A', 'A-', 'B+', 'B')),
  status text not null check (status in ('Passed with Honors', 'Passed', 'In Progress')),
  term text not null,
  position int not null default 0
);
create index grades_student_idx on public.grades (student_id);

create table public.gpa_history (
  student_id uuid not null references public.profiles (id) on delete cascade,
  position int not null,
  term text not null,
  gpa numeric(3, 2) not null check (gpa between 0 and 4),
  primary key (student_id, position)
);

-- One row per course certificate: 'In Progress' from enrollment (progress is derived from lesson_progress),
-- 'Earned' with a credential once every lesson is complete.
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id text references public.courses (id) on delete set null,
  title text not null,
  course_title text not null,
  issued_at timestamptz,
  expected_label text,
  credential_id text unique,
  grade text,
  skills text[] not null default '{}',
  status text not null check (status in ('Earned', 'In Progress')),
  unique (student_id, course_id),
  check (status = 'In Progress' or (issued_at is not null and credential_id is not null and grade is not null))
);

create table public.attendance_records (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_code text not null,
  course_name text not null,
  class_date date not null,
  status text not null check (status in ('Present', 'Late', 'Absent', 'Excused')),
  unique (student_id, course_code, class_date)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_code text not null check (char_length(course_code) between 2 and 20),
  leave_date date not null,
  reason text not null check (char_length(trim(reason)) between 10 and 1000),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Declined')),
  created_at timestamptz not null default now()
);

-- One table for every "remind me" toggle: timetable slots, quizzes and events.
create table public.reminders (
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('slot', 'quiz', 'event')),
  target_id text not null check (char_length(target_id) <= 64),
  created_at timestamptz not null default now(),
  primary key (student_id, target_type, target_id)
);

create table public.event_registrations (
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  event_id text not null references public.campus_events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, event_id)
);

create table public.announcement_reads (
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  announcement_id text not null references public.announcements (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (student_id, announcement_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  course text not null default '' check (char_length(course) <= 200),
  content text not null default '' check (char_length(content) <= 20000),
  snippet text check (char_length(snippet) <= 20000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  pinned boolean not null default false,
  lesson text check (char_length(lesson) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_student_idx on public.notes (student_id, updated_at desc);

create table public.faq_votes (
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  faq_id text not null references public.faqs (id) on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz not null default now(),
  primary key (student_id, faq_id)
);

create table public.support_tickets (
  id text primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (char_length(category) between 2 and 80),
  subject text not null check (char_length(trim(subject)) between 8 and 200),
  description text not null check (char_length(trim(description)) between 20 and 5000),
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
  attachment_name text,
  attachment_size text,
  attachment_path text,
  resolution_notes text,
  -- Who touched the ticket last ('You', 'DevOps Admin', ...); null while it awaits staff triage.
  last_update_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_student_idx on public.support_tickets (student_id, created_at desc);

create table public.ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_role text not null check (author_role in ('Student', 'Support Team', 'Faculty', 'System')),
  author_avatar text,
  content text not null check (char_length(trim(content)) between 1 and 5000),
  attachment_name text,
  attachment_path text,
  created_at timestamptz not null default now()
);
create index ticket_replies_ticket_idx on public.ticket_replies (ticket_id, created_at);

create table public.support_chat_messages (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  sender text not null check (sender in ('student', 'agent')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_chat_student_idx on public.support_chat_messages (student_id, created_at);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role text not null check (char_length(role) between 2 and 80),
  type text not null check (type in ('Technical', 'HR', 'Behavioral', 'Coding', 'Aptitude')),
  level text not null check (char_length(level) between 2 and 40),
  score int not null check (score between 0 and 100),
  duration_seconds int not null check (duration_seconds >= 0),
  responses jsonb not null default '[]'::jsonb check (jsonb_typeof(responses) = 'array' and pg_column_size(responses) < 65536),
  created_at timestamptz not null default now()
);
create index interview_sessions_student_idx on public.interview_sessions (student_id, created_at desc);

create table public.resumes (
  student_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 65536),
  updated_at timestamptz not null default now()
);

create table public.mentor_meetings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id text not null references public.mentors (id) on delete cascade,
  meeting_date date not null,
  slot text not null,
  ends_slot text not null,
  topic text not null,
  agenda text check (char_length(agenda) <= 2000),
  zoom_url text,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, mentor_id)
);
-- A mentor can't be booked twice for the same slot.
create unique index mentor_meetings_slot_idx on public.mentor_meetings (mentor_id, meeting_date, slot) where status = 'Scheduled';

create table public.mentor_requests (
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mentor_id text not null references public.mentors (id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Declined')),
  created_at timestamptz not null default now(),
  primary key (student_id, mentor_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('class', 'doubt', 'grade', 'system', 'payment', 'assessment')),
  title text not null,
  message text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_student_idx on public.notifications (student_id, created_at desc);

-- ========================= Community (shared, user-written) =========================
-- Author columns are filled by a trigger from the caller's profile, so they can't be forged (clients may only insert
-- the content columns; author_name has a default so the generated insert types don't ask for it).

create table public.community_posts (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references public.profiles (id) on delete cascade,
  author_name text not null default '',
  author_avatar text,
  author_badge text not null default 'Student',
  channel text not null check (channel in ('Hackathons', 'Research & Labs', 'Study Groups', 'General', 'Career')),
  title text not null check (char_length(trim(title)) between 6 and 160),
  content text not null default '' check (char_length(content) <= 5000),
  -- Shown counts = base_* (activity from before the app, seeded) + *_count (kept by triggers).
  base_likes int not null default 0 check (base_likes >= 0),
  base_replies int not null default 0 check (base_replies >= 0),
  like_count int not null default 0 check (like_count >= 0),
  reply_count int not null default 0 check (reply_count >= 0),
  created_at timestamptz not null default now()
);
create index community_posts_created_idx on public.community_posts (created_at desc);

create table public.post_replies (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.community_posts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete cascade,
  author_name text not null default '',
  author_avatar text,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index post_replies_post_idx on public.post_replies (post_id, created_at);

create table public.post_likes (
  post_id text not null references public.community_posts (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, student_id)
);

create table public.post_saves (
  post_id text not null references public.community_posts (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, student_id)
);

create table public.squad_members (
  squad_id text not null references public.study_squads (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (squad_id, student_id)
);

create table public.course_questions (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete cascade,
  author_name text not null default '',
  author_avatar text,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  base_votes int not null default 0 check (base_votes >= 0),
  vote_count int not null default 0 check (vote_count >= 0),
  answer_author text,
  answer_text text,
  created_at timestamptz not null default now()
);
create index course_questions_course_idx on public.course_questions (course_id, created_at desc);

create table public.course_question_votes (
  question_id text not null references public.course_questions (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, student_id)
);

-- ================================ Privileges ================================
-- Supabase grants everything to anon/authenticated by default; start from nothing and grant per table.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.courses, public.course_modules, public.lessons, public.course_materials, public.assignments, public.quizzes,
  public.timetable_slots, public.campus_events, public.announcements, public.faqs, public.mentors, public.study_squads
to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, location, bio, avatar_url, notification_prefs, quiet_hours, ui_state) on public.profiles to authenticated;

-- Written only by SECURITY DEFINER functions and triggers.
grant select on
  public.lesson_progress, public.study_activity, public.assignment_submissions, public.quiz_attempts, public.grades,
  public.gpa_history, public.certificates, public.attendance_records, public.support_tickets, public.ticket_replies,
  public.support_chat_messages, public.mentor_meetings
to authenticated;

-- Direct writes: inserts are limited to the columns a student may set. student_id defaults to auth.uid(), status
-- columns keep their defaults, and the RLS policies below reject rows for anyone else.
grant select on
  public.enrollments, public.leave_requests, public.announcement_reads, public.mentor_requests, public.interview_sessions,
  public.reminders, public.event_registrations, public.post_likes, public.post_saves, public.squad_members,
  public.course_question_votes, public.notes, public.faq_votes, public.resumes, public.notifications
to authenticated;
grant insert (course_id) on public.enrollments to authenticated;
grant insert (course_code, leave_date, reason) on public.leave_requests to authenticated;
grant insert (announcement_id) on public.announcement_reads to authenticated;
grant insert (mentor_id) on public.mentor_requests to authenticated;
grant insert (role, type, level, score, duration_seconds, responses) on public.interview_sessions to authenticated;
grant insert (target_type, target_id) on public.reminders to authenticated;
grant insert (event_id) on public.event_registrations to authenticated;
grant insert (post_id) on public.post_likes, public.post_saves to authenticated;
grant insert (squad_id) on public.squad_members to authenticated;
grant insert (question_id) on public.course_question_votes to authenticated;
grant insert (title, course, content, snippet, tags, pinned, lesson), update (title, course, content, snippet, tags, pinned, lesson) on public.notes to authenticated;
grant insert (faq_id, vote), update (faq_id, vote) on public.faq_votes to authenticated;
grant insert (data), update (data) on public.resumes to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on
  public.mentor_requests, public.interview_sessions, public.reminders, public.event_registrations, public.post_likes,
  public.post_saves, public.squad_members, public.course_question_votes, public.notes, public.faq_votes, public.notifications
to authenticated;

grant select on public.community_posts, public.post_replies, public.course_questions to authenticated;
grant insert (channel, title, content) on public.community_posts to authenticated;
grant insert (post_id, body) on public.post_replies to authenticated;
grant insert (course_id, body) on public.course_questions to authenticated;
grant delete on public.community_posts, public.post_replies, public.course_questions to authenticated;

-- ================================ Row-level security ================================

do $$
declare t text;
begin
  foreach t in array array[
    'courses', 'course_modules', 'lessons', 'course_materials', 'assignments', 'quizzes', 'quiz_questions',
    'timetable_slots', 'campus_events', 'announcements', 'faqs', 'mentors', 'study_squads', 'profiles',
    'enrollments', 'lesson_progress', 'study_activity', 'assignment_submissions', 'quiz_attempts', 'grades',
    'gpa_history', 'certificates', 'attendance_records', 'leave_requests', 'reminders', 'event_registrations',
    'announcement_reads', 'notes', 'faq_votes', 'support_tickets', 'ticket_replies', 'support_chat_messages',
    'interview_sessions', 'resumes', 'mentor_meetings', 'mentor_requests', 'notifications', 'community_posts',
    'post_replies', 'post_likes', 'post_saves', 'squad_members', 'course_questions', 'course_question_votes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Shared, read-only content: any signed-in user can read it.
  foreach t in array array[
    'courses', 'course_modules', 'lessons', 'course_materials', 'assignments', 'quizzes', 'timetable_slots',
    'campus_events', 'announcements', 'faqs', 'mentors', 'study_squads', 'community_posts', 'post_replies', 'course_questions'
  ] loop
    execute format('create policy "Signed-in users read %1$s" on public.%1$I for select to authenticated using (true)', t);
  end loop;

  -- Per-student rows: the owner can do whatever the table grants allow; nobody else sees them.
  foreach t in array array[
    'enrollments', 'lesson_progress', 'study_activity', 'assignment_submissions', 'quiz_attempts', 'grades',
    'gpa_history', 'certificates', 'attendance_records', 'leave_requests', 'reminders', 'event_registrations',
    'announcement_reads', 'notes', 'faq_votes', 'support_tickets', 'support_chat_messages', 'interview_sessions',
    'resumes', 'mentor_meetings', 'mentor_requests', 'notifications', 'post_likes', 'post_saves', 'squad_members',
    'course_question_votes'
  ] loop
    execute format(
      'create policy "Students manage their own %1$s" on public.%1$I for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()))',
      t
    );
  end loop;
end
$$;

create policy "Students read their own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Students update their own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Students read replies on their tickets" on public.ticket_replies for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and t.student_id = (select auth.uid())));

create policy "Students post as themselves" on public.community_posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Students delete their own posts" on public.community_posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "Students reply as themselves" on public.post_replies for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Students delete their own replies" on public.post_replies for delete to authenticated using (author_id = (select auth.uid()));
create policy "Students ask as themselves" on public.course_questions for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Students delete their own questions" on public.course_questions for delete to authenticated using (author_id = (select auth.uid()));

-- Enrolling is allowed only in courses that exist (the FK covers it) and only for yourself (the policy covers it).

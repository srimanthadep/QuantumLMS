CREATE SCHEMA IF NOT EXISTS "lms";
--> statement-breakpoint
CREATE SEQUENCE "lms"."roll_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "lms"."ticket_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 92146 CACHE 1;--> statement-breakpoint
CREATE TABLE "lms"."announcement_reads" (
	"student_id" uuid NOT NULL,
	"announcement_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_reads_pkey" PRIMARY KEY("student_id","announcement_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"attachment_name" text,
	"attachment_size" text,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "announcements_category_check" CHECK (category = ANY (ARRAY['Urgent'::text, 'Academic'::text, 'Infrastructure'::text, 'General'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms"."assignment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"assignment_id" text NOT NULL,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"repo_url" text,
	"comments" text,
	"file_path" text,
	"file_name" text,
	"file_size" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer,
	"grade" text,
	"feedback" text,
	"graded_at" timestamp with time zone,
	CONSTRAINT "assignment_submissions_student_id_assignment_id_key" UNIQUE("student_id","assignment_id"),
	CONSTRAINT "assignment_submissions_comments_check" CHECK (char_length(comments) <= 4000),
	CONSTRAINT "assignment_submissions_score_check" CHECK (score >= 0),
	CONSTRAINT "assignment_submissions_status_check" CHECK (status = ANY (ARRAY['Submitted'::text, 'Graded'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"max_marks" integer DEFAULT 100 NOT NULL,
	"priority" text DEFAULT 'Normal' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "assignments_max_marks_check" CHECK (max_marks > 0),
	CONSTRAINT "assignments_priority_check" CHECK (priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Normal'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."attendance_records" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lms"."attendance_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" uuid NOT NULL,
	"course_code" text NOT NULL,
	"course_name" text NOT NULL,
	"class_date" date NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "attendance_records_student_id_course_code_class_date_key" UNIQUE("student_id","course_code","class_date"),
	CONSTRAINT "attendance_records_status_check" CHECK (status = ANY (ARRAY['Present'::text, 'Late'::text, 'Absent'::text, 'Excused'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."campus_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"time_label" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"speaker" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "campus_events_category_check" CHECK (category = ANY (ARRAY['Hackathons'::text, 'Guest Lectures'::text, 'Workshops'::text, 'Academic'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" text,
	"title" text NOT NULL,
	"course_title" text NOT NULL,
	"issued_at" timestamp with time zone,
	"expected_label" text,
	"credential_id" text,
	"grade" text,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "certificates_student_id_course_id_key" UNIQUE("student_id","course_id"),
	CONSTRAINT "certificates_credential_id_key" UNIQUE("credential_id"),
	CONSTRAINT "certificates_check" CHECK ((status = 'In Progress'::text) OR ((issued_at IS NOT NULL) AND (credential_id IS NOT NULL) AND (grade IS NOT NULL))),
	CONSTRAINT "certificates_status_check" CHECK (status = ANY (ARRAY['Earned'::text, 'In Progress'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."community_posts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"author_id" uuid,
	"author_name" text DEFAULT '' NOT NULL,
	"author_avatar" text,
	"author_badge" text DEFAULT 'Student' NOT NULL,
	"channel" text NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"base_likes" integer DEFAULT 0 NOT NULL,
	"base_replies" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_posts_base_likes_check" CHECK (base_likes >= 0),
	CONSTRAINT "community_posts_base_replies_check" CHECK (base_replies >= 0),
	CONSTRAINT "community_posts_channel_check" CHECK (channel = ANY (ARRAY['Hackathons'::text, 'Research & Labs'::text, 'Study Groups'::text, 'General'::text, 'Career'::text])),
	CONSTRAINT "community_posts_content_check" CHECK (char_length(content) <= 5000),
	CONSTRAINT "community_posts_like_count_check" CHECK (like_count >= 0),
	CONSTRAINT "community_posts_reply_count_check" CHECK (reply_count >= 0),
	CONSTRAINT "community_posts_title_check" CHECK ((char_length(TRIM(BOTH FROM title)) >= 6) AND (char_length(TRIM(BOTH FROM title)) <= 160))
);
--> statement-breakpoint
CREATE TABLE "lms"."course_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"description" text DEFAULT '' NOT NULL,
	"file_name" text,
	"url" text,
	"drive_url" text,
	"drive_id" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"content" text,
	"mime_type" text,
	CONSTRAINT "course_materials_type_check" CHECK (type = ANY (ARRAY['PDF'::text, 'Code Notebook'::text, 'Dataset'::text, 'Slides'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."course_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	CONSTRAINT "course_modules_course_id_position_key" UNIQUE("course_id","position")
);
--> statement-breakpoint
CREATE TABLE "lms"."course_question_votes" (
	"question_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_question_votes_pkey" PRIMARY KEY("question_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."course_questions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"course_id" text NOT NULL,
	"author_id" uuid,
	"author_name" text DEFAULT '' NOT NULL,
	"author_avatar" text,
	"body" text NOT NULL,
	"base_votes" integer DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"answer_author" text,
	"answer_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_questions_base_votes_check" CHECK (base_votes >= 0),
	CONSTRAINT "course_questions_body_check" CHECK ((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)),
	CONSTRAINT "course_questions_vote_count_check" CHECK (vote_count >= 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."courses" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"instructor" text NOT NULL,
	"instructor_role" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"level" text NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	"rating" text DEFAULT '' NOT NULL,
	"reviews" text DEFAULT '' NOT NULL,
	"progress_color" text DEFAULT '' NOT NULL,
	"certificate_title" text,
	"certificate_skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_starter" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "courses_code_key" UNIQUE("code"),
	CONSTRAINT "courses_credits_check" CHECK (credits >= 0),
	CONSTRAINT "courses_level_check" CHECK (level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."enrollments" (
	"student_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_pkey" PRIMARY KEY("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."event_registrations" (
	"student_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_registrations_pkey" PRIMARY KEY("student_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."faq_votes" (
	"student_id" uuid NOT NULL,
	"faq_id" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faq_votes_pkey" PRIMARY KEY("student_id","faq_id"),
	CONSTRAINT "faq_votes_vote_check" CHECK (vote = ANY (ARRAY['up'::text, 'down'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"link_target" text,
	"link_label" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms"."gpa_history" (
	"student_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"term" text NOT NULL,
	"gpa" numeric(3, 2) NOT NULL,
	CONSTRAINT "gpa_history_pkey" PRIMARY KEY("student_id","position"),
	CONSTRAINT "gpa_history_gpa_check" CHECK ((gpa >= (0)::numeric) AND (gpa <= (4)::numeric))
);
--> statement-breakpoint
CREATE TABLE "lms"."grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_code" text NOT NULL,
	"course_title" text NOT NULL,
	"credits" integer NOT NULL,
	"midterm" numeric(5, 1) NOT NULL,
	"assignments" numeric(5, 1) NOT NULL,
	"final_exam" numeric(5, 1) NOT NULL,
	"total_score" numeric(5, 1) NOT NULL,
	"letter_grade" text NOT NULL,
	"status" text NOT NULL,
	"term" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "grades_letter_grade_check" CHECK (letter_grade = ANY (ARRAY['A+'::text, 'A'::text, 'A-'::text, 'B+'::text, 'B'::text])),
	CONSTRAINT "grades_status_check" CHECK (status = ANY (ARRAY['Passed with Honors'::text, 'Passed'::text, 'In Progress'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"role" text NOT NULL,
	"type" text NOT NULL,
	"level" text NOT NULL,
	"score" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_sessions_duration_seconds_check" CHECK (duration_seconds >= 0),
	CONSTRAINT "interview_sessions_level_check" CHECK ((char_length(level) >= 2) AND (char_length(level) <= 40)),
	CONSTRAINT "interview_sessions_responses_check" CHECK ((jsonb_typeof(responses) = 'array'::text) AND (pg_column_size(responses) < 65536)),
	CONSTRAINT "interview_sessions_role_check" CHECK ((char_length(role) >= 2) AND (char_length(role) <= 80)),
	CONSTRAINT "interview_sessions_score_check" CHECK ((score >= 0) AND (score <= 100)),
	CONSTRAINT "interview_sessions_type_check" CHECK (type = ANY (ARRAY['Technical'::text, 'HR'::text, 'Behavioral'::text, 'Coding'::text, 'Aptitude'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_code" text NOT NULL,
	"leave_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_requests_course_code_check" CHECK ((char_length(course_code) >= 2) AND (char_length(course_code) <= 20)),
	CONSTRAINT "leave_requests_reason_check" CHECK ((char_length(TRIM(BOTH FROM reason)) >= 10) AND (char_length(TRIM(BOTH FROM reason)) <= 1000)),
	CONSTRAINT "leave_requests_status_check" CHECK (status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Declined'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."lesson_progress" (
	"student_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"course_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_pkey" PRIMARY KEY("student_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"course_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"type" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	CONSTRAINT "lessons_course_id_position_key" UNIQUE("course_id","position"),
	CONSTRAINT "lessons_minutes_check" CHECK (minutes >= 0),
	CONSTRAINT "lessons_type_check" CHECK (type = ANY (ARRAY['video'::text, 'reading'::text, 'lab'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."mentor_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"mentor_id" text NOT NULL,
	"meeting_date" date NOT NULL,
	"slot" text NOT NULL,
	"ends_slot" text NOT NULL,
	"topic" text NOT NULL,
	"agenda" text,
	"zoom_url" text,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_meetings_student_id_mentor_id_key" UNIQUE("student_id","mentor_id"),
	CONSTRAINT "mentor_meetings_agenda_check" CHECK (char_length(agenda) <= 2000),
	CONSTRAINT "mentor_meetings_status_check" CHECK (status = ANY (ARRAY['Scheduled'::text, 'Cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."mentor_requests" (
	"student_id" uuid NOT NULL,
	"mentor_id" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_requests_pkey" PRIMARY KEY("student_id","mentor_id"),
	CONSTRAINT "mentor_requests_status_check" CHECK (status = ANY (ARRAY['Pending'::text, 'Accepted'::text, 'Declined'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."mentors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"office" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"specializations" text[] DEFAULT '{}'::text[] NOT NULL,
	"office_hours" text DEFAULT '' NOT NULL,
	"availability" text DEFAULT 'Available Now' NOT NULL,
	"zoom_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mentors_availability_check" CHECK (availability = ANY (ARRAY['Available Now'::text, 'In Lecture'::text, 'Away'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text NOT NULL,
	"course" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"snippet" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"lesson" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_content_check" CHECK (char_length(content) <= 20000),
	CONSTRAINT "notes_course_check" CHECK (char_length(course) <= 200),
	CONSTRAINT "notes_lesson_check" CHECK (char_length(lesson) <= 200),
	CONSTRAINT "notes_snippet_check" CHECK (char_length(snippet) <= 20000),
	CONSTRAINT "notes_tags_check" CHECK (cardinality(tags) <= 20),
	CONSTRAINT "notes_title_check" CHECK ((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200))
);
--> statement-breakpoint
CREATE TABLE "lms"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_kind_check" CHECK (kind = ANY (ARRAY['class'::text, 'doubt'::text, 'grade'::text, 'system'::text, 'payment'::text, 'assessment'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."post_likes" (
	"post_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_pkey" PRIMARY KEY("post_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."post_replies" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"post_id" text NOT NULL,
	"author_id" uuid,
	"author_name" text DEFAULT '' NOT NULL,
	"author_avatar" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_replies_body_check" CHECK ((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000))
);
--> statement-breakpoint
CREATE TABLE "lms"."post_saves" (
	"post_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_saves_pkey" PRIMARY KEY("post_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"headline" text DEFAULT 'Learner' NOT NULL,
	"roll_number" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"program" text DEFAULT 'Bachelor of Science in Artificial Intelligence' NOT NULL,
	"batch" text DEFAULT 'Class of 2027 · Year 4' NOT NULL,
	"department" text DEFAULT 'School of Computing & Machine Intelligence' NOT NULL,
	"gpa" text DEFAULT '–' NOT NULL,
	"credits_completed" integer DEFAULT 0 NOT NULL,
	"total_credits" integer DEFAULT 60 NOT NULL,
	"campus_address" text DEFAULT '' NOT NULL,
	"emergency_contact" text DEFAULT '' NOT NULL,
	"mentor_id" text,
	"notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quiet_hours" text DEFAULT '22-07' NOT NULL,
	"ui_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_roll_number_key" UNIQUE("roll_number"),
	CONSTRAINT "profiles_bio_check" CHECK (char_length(bio) <= 200),
	CONSTRAINT "profiles_location_check" CHECK (char_length(location) <= 120),
	CONSTRAINT "profiles_notification_prefs_check" CHECK (jsonb_typeof(notification_prefs) = 'object'::text),
	CONSTRAINT "profiles_phone_check" CHECK (char_length(phone) <= 40),
	CONSTRAINT "profiles_quiet_hours_check" CHECK (quiet_hours ~ '^(off|[0-9]{2}-[0-9]{2})$'::text),
	CONSTRAINT "profiles_ui_state_check" CHECK ((jsonb_typeof(ui_state) = 'object'::text) AND (pg_column_size(ui_state) < 8192))
);
--> statement-breakpoint
CREATE TABLE "lms"."quiz_attempts" (
	"id" text PRIMARY KEY DEFAULT ('att-' || replace(gen_random_uuid()::text, '-', '')) NOT NULL,
	"student_id" uuid NOT NULL,
	"quiz_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"time_taken_seconds" integer,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" integer,
	"max_score" integer,
	"pct" integer,
	"passed" boolean,
	"feedback" text,
	CONSTRAINT "quiz_attempts_student_id_quiz_id_attempt_number_key" UNIQUE("student_id","quiz_id","attempt_number"),
	CONSTRAINT "quiz_attempts_answers_check" CHECK (jsonb_typeof(answers) = 'object'::text),
	CONSTRAINT "quiz_attempts_attempt_number_check" CHECK (attempt_number > 0),
	CONSTRAINT "quiz_attempts_check" CHECK (((submitted_at IS NULL) AND (score IS NULL) AND (pct IS NULL) AND (passed IS NULL)) OR ((submitted_at IS NOT NULL) AND (score IS NOT NULL) AND (max_score IS NOT NULL) AND (pct IS NOT NULL) AND (passed IS NOT NULL) AND (time_taken_seconds IS NOT NULL))),
	CONSTRAINT "quiz_attempts_max_score_check" CHECK (max_score > 0),
	CONSTRAINT "quiz_attempts_pct_check" CHECK ((pct >= 0) AND (pct <= 100)),
	CONSTRAINT "quiz_attempts_score_check" CHECK (score >= 0),
	CONSTRAINT "quiz_attempts_time_taken_seconds_check" CHECK (time_taken_seconds > 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."quiz_questions" (
	"quiz_id" text NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"topic" text,
	"difficulty" text,
	CONSTRAINT "quiz_questions_pkey" PRIMARY KEY("quiz_id","position"),
	CONSTRAINT "quiz_questions_check" CHECK ((correct_index >= 0) AND (correct_index < cardinality(options))),
	CONSTRAINT "quiz_questions_difficulty_check" CHECK (difficulty = ANY (ARRAY['Easy'::text, 'Medium'::text, 'Hard'::text])),
	CONSTRAINT "quiz_questions_options_check" CHECK ((cardinality(options) >= 2) AND (cardinality(options) <= 6)),
	CONSTRAINT "quiz_questions_position_check" CHECK ("position" > 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."quizzes" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"passing_pct" integer NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"question_count" integer DEFAULT 0 NOT NULL,
	"available_from" timestamp with time zone,
	"due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "quizzes_duration_minutes_check" CHECK (duration_minutes > 0),
	CONSTRAINT "quizzes_max_attempts_check" CHECK (max_attempts > 0),
	CONSTRAINT "quizzes_passing_pct_check" CHECK ((passing_pct >= 0) AND (passing_pct <= 100))
);
--> statement-breakpoint
CREATE TABLE "lms"."reminders" (
	"student_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_pkey" PRIMARY KEY("student_id","target_type","target_id"),
	CONSTRAINT "reminders_target_id_check" CHECK (char_length(target_id) <= 64),
	CONSTRAINT "reminders_target_type_check" CHECK (target_type = ANY (ARRAY['slot'::text, 'quiz'::text, 'event'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."resumes" (
	"student_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_data_check" CHECK ((jsonb_typeof(data) = 'object'::text) AND (pg_column_size(data) < 65536))
);
--> statement-breakpoint
CREATE TABLE "lms"."squad_members" (
	"squad_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "squad_members_pkey" PRIMARY KEY("squad_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lms"."study_activity" (
	"student_id" uuid NOT NULL,
	"day" date NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"lessons" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "study_activity_pkey" PRIMARY KEY("student_id","day"),
	CONSTRAINT "study_activity_lessons_check" CHECK (lessons >= 0),
	CONSTRAINT "study_activity_minutes_check" CHECK (minutes >= 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."study_squads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_members" integer DEFAULT 0 NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"next_session" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "study_squads_base_members_check" CHECK (base_members >= 0),
	CONSTRAINT "study_squads_member_count_check" CHECK (member_count >= 0)
);
--> statement-breakpoint
CREATE TABLE "lms"."support_chat_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lms"."support_chat_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" uuid NOT NULL,
	"sender" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_chat_messages_body_check" CHECK ((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)),
	CONSTRAINT "support_chat_messages_sender_check" CHECK (sender = ANY (ARRAY['student'::text, 'agent'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"attachment_name" text,
	"attachment_size" text,
	"attachment_path" text,
	"resolution_notes" text,
	"last_update_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_category_check" CHECK ((char_length(category) >= 2) AND (char_length(category) <= 80)),
	CONSTRAINT "support_tickets_description_check" CHECK ((char_length(TRIM(BOTH FROM description)) >= 20) AND (char_length(TRIM(BOTH FROM description)) <= 5000)),
	CONSTRAINT "support_tickets_priority_check" CHECK (priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Urgent'::text])),
	CONSTRAINT "support_tickets_status_check" CHECK (status = ANY (ARRAY['Open'::text, 'In Progress'::text, 'Resolved'::text, 'Closed'::text])),
	CONSTRAINT "support_tickets_subject_check" CHECK ((char_length(TRIM(BOTH FROM subject)) >= 8) AND (char_length(TRIM(BOTH FROM subject)) <= 200))
);
--> statement-breakpoint
CREATE TABLE "lms"."ticket_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" text NOT NULL,
	"author_id" uuid,
	"author_name" text NOT NULL,
	"author_role" text NOT NULL,
	"author_avatar" text,
	"content" text NOT NULL,
	"attachment_name" text,
	"attachment_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_replies_author_role_check" CHECK (author_role = ANY (ARRAY['Student'::text, 'Support Team'::text, 'Faculty'::text, 'System'::text])),
	CONSTRAINT "ticket_replies_content_check" CHECK ((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(TRIM(BOTH FROM content)) <= 5000))
);
--> statement-breakpoint
CREATE TABLE "lms"."timetable_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"starts" time NOT NULL,
	"ends" time NOT NULL,
	"course_code" text NOT NULL,
	"course_id" text,
	"title" text NOT NULL,
	"instructor" text NOT NULL,
	"room" text NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	CONSTRAINT "timetable_slots_check" CHECK (ends > starts),
	CONSTRAINT "timetable_slots_day_check" CHECK (day = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text]))
);
--> statement-breakpoint
CREATE TABLE "lms"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cognito_sub" text,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"avatar_url" text,
	"role" text DEFAULT 'Student' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "users_cognito_sub_key" UNIQUE("cognito_sub"),
	CONSTRAINT "users_role_check" CHECK (role = ANY (ARRAY['Student'::text, 'Teacher'::text, 'Evaluator'::text, 'Support'::text, 'Admin'::text, 'Super Admin'::text])),
	CONSTRAINT "users_full_name_check" CHECK ((char_length(full_name) >= 1) AND (char_length(full_name) <= 120)),
	CONSTRAINT "users_avatar_url_check" CHECK ((avatar_url IS NULL) OR (avatar_url ~ '^(https://|/assets/|/api/files/)'::text))
);
--> statement-breakpoint
ALTER TABLE "lms"."announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "lms"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."announcement_reads" ADD CONSTRAINT "announcement_reads_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "lms"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."certificates" ADD CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_materials" ADD CONSTRAINT "course_materials_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_question_votes" ADD CONSTRAINT "course_question_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lms"."course_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_question_votes" ADD CONSTRAINT "course_question_votes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_questions" ADD CONSTRAINT "course_questions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."course_questions" ADD CONSTRAINT "course_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "lms"."campus_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."event_registrations" ADD CONSTRAINT "event_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."faq_votes" ADD CONSTRAINT "faq_votes_faq_id_fkey" FOREIGN KEY ("faq_id") REFERENCES "lms"."faqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."faq_votes" ADD CONSTRAINT "faq_votes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."gpa_history" ADD CONSTRAINT "gpa_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."interview_sessions" ADD CONSTRAINT "interview_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."leave_requests" ADD CONSTRAINT "leave_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "lms"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."mentor_meetings" ADD CONSTRAINT "mentor_meetings_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "lms"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."mentor_meetings" ADD CONSTRAINT "mentor_meetings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "lms"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."mentor_requests" ADD CONSTRAINT "mentor_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."notes" ADD CONSTRAINT "notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."notifications" ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "lms"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."post_likes" ADD CONSTRAINT "post_likes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."post_replies" ADD CONSTRAINT "post_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."post_replies" ADD CONSTRAINT "post_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "lms"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."post_saves" ADD CONSTRAINT "post_saves_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "lms"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."post_saves" ADD CONSTRAINT "post_saves_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "lms"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."profiles" ADD CONSTRAINT "profiles_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "lms"."mentors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "lms"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."reminders" ADD CONSTRAINT "reminders_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."resumes" ADD CONSTRAINT "resumes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."squad_members" ADD CONSTRAINT "squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "lms"."study_squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."squad_members" ADD CONSTRAINT "squad_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."study_activity" ADD CONSTRAINT "study_activity_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."support_chat_messages" ADD CONSTRAINT "support_chat_messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."support_tickets" ADD CONSTRAINT "support_tickets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."ticket_replies" ADD CONSTRAINT "ticket_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "lms"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "lms"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms"."timetable_slots" ADD CONSTRAINT "timetable_slots_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_course_idx" ON "lms"."assignments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "community_posts_created_idx" ON "lms"."community_posts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "course_materials_course_idx" ON "lms"."course_materials" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "course_questions_course_idx" ON "lms"."course_questions" USING btree ("course_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "grades_student_idx" ON "lms"."grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_student_idx" ON "lms"."interview_sessions" USING btree ("student_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lesson_progress_course_idx" ON "lms"."lesson_progress" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "lessons_module_idx" ON "lms"."lessons" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_meetings_slot_idx" ON "lms"."mentor_meetings" USING btree ("mentor_id","meeting_date","slot") WHERE (status = 'Scheduled'::text);--> statement-breakpoint
CREATE INDEX "notes_student_idx" ON "lms"."notes" USING btree ("student_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_student_idx" ON "lms"."notifications" USING btree ("student_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "post_replies_post_idx" ON "lms"."post_replies" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_one_open_idx" ON "lms"."quiz_attempts" USING btree ("student_id","quiz_id") WHERE (submitted_at IS NULL);--> statement-breakpoint
CREATE INDEX "quiz_attempts_open_deadline_idx" ON "lms"."quiz_attempts" USING btree ("deadline_at") WHERE (submitted_at IS NULL);--> statement-breakpoint
CREATE INDEX "quizzes_course_idx" ON "lms"."quizzes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "support_chat_student_idx" ON "lms"."support_chat_messages" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_student_idx" ON "lms"."support_tickets" USING btree ("student_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ticket_replies_ticket_idx" ON "lms"."ticket_replies" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "lms"."users" USING btree (lower("email"));
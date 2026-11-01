select 'courses' as t, count(*) as n from public.courses
union all select 'modules', count(*) from public.course_modules
union all select 'lessons', count(*) from public.lessons
union all select 'materials', count(*) from public.course_materials
union all select 'assignments', count(*) from public.assignments
union all select 'quizzes', count(*) from public.quizzes
union all select 'questions', count(*) from public.quiz_questions
union all select 'slots', count(*) from public.timetable_slots
union all select 'events', count(*) from public.campus_events
union all select 'announcements', count(*) from public.announcements
union all select 'faqs', count(*) from public.faqs
union all select 'mentors', count(*) from public.mentors
union all select 'squads', count(*) from public.study_squads
union all select 'posts', count(*) from public.community_posts
union all select 'replies', count(*) from public.post_replies
union all select 'course_questions', count(*) from public.course_questions
union all select 'buckets', count(*) from storage.buckets
union all select 'storage_policies', count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
union all select 'public_policies', count(*) from pg_policies where schemaname = 'public'
union all select 'cron_jobs', (select count(*) from cron.job)
union all select 'rls_off', count(*) from pg_tables where schemaname = 'public' and not rowsecurity
union all select 'migrations', count(*) from supabase_migrations.schema_migrations;

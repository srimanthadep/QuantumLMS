with s as (select id from public.profiles where is_demo limit 1)
select 'attempt' as k, jsonb_build_object('id', a.id, 'score', a.score, 'max', a.max_score, 'pct', a.pct, 'passed', a.passed, 'secs', a.time_taken_seconds, 'submitted', a.submitted_at) as v
from public.quiz_attempts a, s where a.student_id = s.id
union all
select 'cert', jsonb_build_object('course', c.course_id, 'status', c.status, 'title', c.title, 'cred', c.credential_id, 'grade', c.grade, 'expected', c.expected_label)
from public.certificates c, s where c.student_id = s.id
union all
select 'attendance', jsonb_build_object('code', r.course_code, 'total', count(*), 'present', count(*) filter (where r.status = 'Present'), 'late', count(*) filter (where r.status = 'Late'), 'absent', count(*) filter (where r.status = 'Absent'), 'excused', count(*) filter (where r.status = 'Excused'), 'first', min(r.class_date), 'last', max(r.class_date))
from public.attendance_records r, s where r.student_id = s.id group by r.course_code
union all
select 'activity', jsonb_build_object('days', count(*), 'minutes', sum(minutes), 'last', max(day), 'today', app_private.local_today())
from public.study_activity a, s where a.student_id = s.id
union all
select 'meeting', to_jsonb(m) - 'student_id' from public.mentor_meetings m, s where m.student_id = s.id
union all
select 'notifications', jsonb_build_object('n', count(*), 'unread', count(*) filter (where read_at is null)) from public.notifications n, s where n.student_id = s.id
union all
select 'posts', jsonb_agg(jsonb_build_object('id', p.id, 'likes', p.base_likes + p.like_count, 'replies', p.base_replies + p.reply_count, 'channel', p.channel) order by p.id) from public.community_posts p
union all
select 'squads', jsonb_agg(jsonb_build_object('id', q.id, 'members', q.base_members + q.member_count) order by q.id) from public.study_squads q
union all
select 'tickets', jsonb_agg(jsonb_build_object('id', t.id, 'status', t.status, 'by', t.last_update_by, 'created', t.created_at, 'updated', t.updated_at, 'replies', (select count(*) from public.ticket_replies r where r.ticket_id = t.id)) order by t.created_at) from public.support_tickets t, s where t.student_id = s.id;

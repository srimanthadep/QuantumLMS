select u.email, u.created_at, p.is_demo,
  (select count(*) from public.lesson_progress l where l.student_id = u.id) as lessons
from auth.users u left join public.profiles p on p.id = u.id
order by u.created_at;

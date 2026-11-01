select o.bucket_id, o.name, o.created_at, p.email as owner_email, (o.metadata ->> 'size')::int as size
from storage.objects o
left join auth.users p on p.id = o.owner
order by o.bucket_id, o.created_at;

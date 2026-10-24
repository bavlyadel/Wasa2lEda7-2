-- شغّله مرة واحدة في Supabase > SQL Editor بعد migration.sql و migration2.sql (آمن لو اتشغل أكتر من مرة)

-- ===== 1) رقم الموبايل ودور الخادم =====
alter table public.profiles add column if not exists phone text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member','admin','server'));
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, new.raw_user_meta_data->>'phone', 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ===== 2) الاعتذار عن طلب (العضو يلغي طلباته المعلّقة بس) =====
drop policy if exists "members delete own pending requests" on public.service_requests;
create policy "members delete own pending requests" on public.service_requests for delete to authenticated
using (user_id = auth.uid() and status = 'pending');

-- العضو يقدر يسجّل طلبه حتى لو اترفض تلقائيًا (قاعدة الـ 36 ساعة)
drop policy if exists "members create own requests" on public.service_requests;
create policy "members create own requests" on public.service_requests for insert to authenticated
with check (user_id = auth.uid() and status in ('pending','rejected'));

-- ===== 3) اختيار الخدام في الجدول: خادم أو مسؤول فقط =====
create or replace function public.lookup_member_by_email(member_email text)
returns table(id uuid, full_name text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name from public.profiles p
  where lower(p.email) = lower(member_email) and p.role in ('server','admin')
  limit 1;
$$;
revoke all on function public.lookup_member_by_email(text) from public, anon;
grant execute on function public.lookup_member_by_email(text) to authenticated;

-- ===== 4) المخزن: حالة الأداة والعيب =====
alter table tools add column if not exists condition text not null default 'good';   -- good | maintenance | broken
alter table tools add column if not exists fault_note text;
alter table tools drop constraint if exists tools_condition_check;
alter table tools add constraint tools_condition_check check (condition in ('good','maintenance','broken'));

-- الأعضاء ما يشوفوش جدول الأدوات ولا الأعداد (المسؤول بس). بياخدوا الأسماء المتاحة من الدالة دي:
drop policy if exists "tl read" on tools;
create or replace function public.list_tools()
returns table(id uuid, name text)
language sql stable security definer set search_path = public
as $$
  select t.id, t.name from tools t where t.condition = 'good' and t.qty_available > 0 order by t.name;
$$;
revoke all on function public.list_tools() from public, anon;
grant execute on function public.list_tools() to authenticated;

-- ===== 5) طلب أدوات متعدد + قاعدة الـ 36 ساعة =====
alter table service_requests add column if not exists tool_items jsonb;      -- [{id,name,qty}]
alter table service_requests add column if not exists needed_at timestamptz; -- موعد الخدمة المطلوب لها الأدوات
alter table service_requests add column if not exists reject_reason text;

create or replace function public.request_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; t record; req timestamptz; uname text;
begin
  if new.tool_items is null or jsonb_typeof(new.tool_items) <> 'array' or jsonb_array_length(new.tool_items) = 0 then
    return new;
  end if;
  if new.service_id is not null then
    select ((s.service_date + s.service_time) at time zone 'Africa/Cairo') into req from services s where s.id = new.service_id;
    if req is not null then new.needed_at := req; end if;
  end if;
  if new.needed_at is null then raise exception 'حدد تاريخ وساعة الخدمة'; end if;

  if new.needed_at < now() + interval '36 hours' then
    new.status := 'rejected';
    new.reject_reason := 'اتأخرت في الطلب: لازم تطلب الأدوات قبل الخدمة بـ 36 ساعة على الأقل. لو في حاجة طارئة كلّم المسؤولين.';
    select coalesce(nullif(full_name,''), email) into uname from profiles where id = new.user_id;
    insert into notifications(user_id, body)
      select id, 'طلب أدوات متأخر اترفض تلقائيًا من ' || coalesce(uname,'عضو') || ': ' || coalesce(new.details,'') from profiles where role = 'admin';
    insert into notifications(user_id, body)
      values (new.user_id, 'طلب الأدوات بتاعك اترفض تلقائيًا لأنك اتأخرت. لازم تطلب قبل الخدمة بـ 36 ساعة على الأقل، ولو في حاجة طارئة كلّم المسؤولين.');
    return new;
  end if;

  for it in select * from jsonb_array_elements(new.tool_items) loop
    if coalesce((it->>'qty')::int, 1) < 1 then raise exception 'عدد غير صالح'; end if;
    select * into t from tools where id = (it->>'id')::uuid;
    if not found or t.condition <> 'good' then raise exception 'الأداة % غير متاحة حاليًا', coalesce(it->>'name',''); end if;
    if coalesce((it->>'qty')::int, 1) > t.qty_available then raise exception 'العدد المطلوب من % أكبر من المتاح', t.name; end if;
  end loop;
  new.status := 'pending';
  return new;
end $$;
drop trigger if exists trg_request_guard on service_requests;
create trigger trg_request_guard before insert on service_requests for each row execute function request_guard();

-- خصم/إرجاع المتاح تلقائيًا عند الموافقة (يدعم الطلب القديم بأداة واحدة والجديد بأدوات متعددة)
create or replace function public.tool_stock() returns trigger language plpgsql security definer set search_path = public as $$
declare it jsonb; sign int := 0;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then sign := -1;
  elsif old.status = 'approved' and new.status is distinct from 'approved' then sign := 1;
  end if;
  if sign = 0 then return new; end if;
  if new.tool_id is not null then
    update tools set qty_available = greatest(0, qty_available + sign * coalesce(new.tool_qty,1)) where id = new.tool_id;
  end if;
  if new.tool_items is not null and jsonb_typeof(new.tool_items) = 'array' then
    for it in select * from jsonb_array_elements(new.tool_items) loop
      update tools set qty_available = greatest(0, qty_available + sign * coalesce((it->>'qty')::int,1)) where id = (it->>'id')::uuid;
    end loop;
  end if;
  return new;
end $$;

-- ===== 6) صور الاستلام والتسليم (للمسؤولين فقط) =====
create table if not exists request_photos(
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  phase text not null check (phase in ('before','after')),
  path text not null,
  created_at timestamptz default now()
);
alter table request_photos enable row level security;
drop policy if exists "rp admin" on request_photos;
create policy "rp admin" on request_photos for all to authenticated using (is_admin_user()) with check (is_admin_user());
drop policy if exists "rp owner insert" on request_photos;
create policy "rp owner insert" on request_photos for insert to authenticated
with check (user_id = auth.uid() and exists(select 1 from service_requests r where r.id = request_id and r.user_id = auth.uid() and r.status = 'approved' and r.tool_items is not null));
drop policy if exists "rp owner read" on request_photos;
create policy "rp owner read" on request_photos for select to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('tool-photos', 'tool-photos', false) on conflict (id) do nothing;
drop policy if exists "tp upload" on storage.objects;
create policy "tp upload" on storage.objects for insert to authenticated
with check (bucket_id = 'tool-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tp admin read" on storage.objects;
create policy "tp admin read" on storage.objects for select to authenticated using (bucket_id = 'tool-photos' and is_admin_user());
drop policy if exists "tp admin delete" on storage.objects;
create policy "tp admin delete" on storage.objects for delete to authenticated using (bucket_id = 'tool-photos' and is_admin_user());

-- ===== 7) ملاحظات المسؤولين (تتكتب وتتمسح) =====
create table if not exists request_notes(
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) on delete cascade,   -- فاضي = ملاحظة عامة
  body text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
alter table request_notes enable row level security;
drop policy if exists "rn admin" on request_notes;
create policy "rn admin" on request_notes for all to authenticated using (is_admin_user()) with check (is_admin_user());

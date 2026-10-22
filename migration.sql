-- شغّله مرة واحدة في Supabase > SQL Editor (آمن لو اتشغل أكتر من مرة)
create or replace function public.is_admin_user() returns boolean language sql security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;

alter table services add column if not exists repeat_days int;      -- تكرار الخدمة كل كام يوم (7 = أسبوعي)
alter table services add column if not exists communion_n int;      -- جمعة التناول لهذه الخدمة (1-4)
alter table services add column if not exists needed int default 1; -- عدد الخدام المطلوبين

create or replace function public.roll_services() returns void language sql security definer set search_path=public as
$$ update services set service_date = service_date + (ceil((current_date - service_date)::numeric / repeat_days)::int * repeat_days)
   where repeat_days > 0 and service_date < current_date $$;
grant execute on function public.roll_services() to authenticated;

do $$ declare t text; begin
  select format_type(atttypid,atttypmod) into t from pg_attribute where attrelid='public.services'::regclass and attname='id';
  execute format('create table if not exists service_assignees(id uuid primary key default gen_random_uuid(), service_id %s references services(id) on delete cascade, user_id uuid, name text not null, status text not null default ''approved'')', t);
end $$;
create table if not exists availability(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), name text, week_date date not null, coming boolean not null default true, from_time time, to_time time, suggested_service text, note text, unique(user_id,week_date));
create table if not exists contacts(id uuid primary key default gen_random_uuid(), name text not null, phone text not null);
create table if not exists notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null, body text not null, read boolean default false, created_at timestamptz default now());

alter table service_assignees enable row level security; alter table availability enable row level security;
alter table contacts enable row level security; alter table notifications enable row level security;

create policy "asg read" on service_assignees for select to authenticated using (status='approved' or is_admin_user());
create policy "asg admin" on service_assignees for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "av read" on availability for select to authenticated using (user_id=auth.uid() or is_admin_user());
create policy "av write" on availability for all to authenticated using (user_id=auth.uid() or is_admin_user()) with check (user_id=auth.uid() or is_admin_user());
create policy "ct read" on contacts for select to authenticated using (true);
create policy "ct admin" on contacts for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "nt read" on notifications for select to authenticated using (user_id=auth.uid());
create policy "nt update" on notifications for update to authenticated using (user_id=auth.uid());
create policy "nt admin" on notifications for insert to authenticated with check (is_admin_user());
create policy "sv admin" on services for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "pf admin read" on profiles for select to authenticated using (is_admin_user());

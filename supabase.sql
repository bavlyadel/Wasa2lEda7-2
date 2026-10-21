-- وسائل إيضاح: شغّل هذا الملف في Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_date date not null,
  service_time time not null,
  location text not null,
  notes text,
  assignee_id uuid references public.profiles(id) on delete set null,
  assignee_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  request_type text not null,
  details text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Lookup only returns a member's public display name and id. Callable by authenticated users;
-- it does not expose a directory or allow role changes.
create or replace function public.lookup_member_by_email(member_email text)
returns table(id uuid, full_name text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name from public.profiles p
  where lower(p.email) = lower(member_email)
  limit 1;
$$;
revoke all on function public.lookup_member_by_email(text) from public, anon;
grant execute on function public.lookup_member_by_email(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "members update own display name" on public.profiles;
create policy "members update own display name" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
-- Column-level restriction: users must not be able to change role/email via the client.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "signed in read services" on public.services;
create policy "signed in read services" on public.services for select to authenticated using (true);
drop policy if exists "admin insert services" on public.services;
create policy "admin insert services" on public.services for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update services" on public.services;
create policy "admin update services" on public.services for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete services" on public.services;
create policy "admin delete services" on public.services for delete to authenticated using (public.is_admin());

drop policy if exists "members read own requests admin reads all" on public.service_requests;
create policy "members read own requests admin reads all" on public.service_requests for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "members create own requests" on public.service_requests;
create policy "members create own requests" on public.service_requests for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "admin update requests" on public.service_requests;
create policy "admin update requests" on public.service_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete requests" on public.service_requests;
create policy "admin delete requests" on public.service_requests for delete to authenticated using (public.is_admin());

-- Add the first admin only AFTER creating an account and replacing the email below:
-- update public.profiles set role = 'admin' where lower(email) = lower('YOUR_ADMIN_EMAIL');

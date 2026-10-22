-- شغّله بعد migration.sql
create table if not exists site_settings(key text primary key, value text);
insert into site_settings values('youth_open','true') on conflict do nothing;
create table if not exists complaints(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid(), name text, body text not null, status text default 'new', created_at timestamptz default now());
create table if not exists youth_applications(id uuid primary key default gen_random_uuid(), name text not null, phone text not null, age int, notes text, status text default 'new', created_at timestamptz default now());
create table if not exists tools(id uuid primary key default gen_random_uuid(), name text not null, qty_total int default 0, qty_available int default 0);
alter table service_requests add column if not exists tool_id uuid references tools(id) on delete set null;
alter table service_requests add column if not exists tool_qty int;
alter table site_settings enable row level security; alter table complaints enable row level security;
alter table youth_applications enable row level security; alter table tools enable row level security;
create policy "ss read" on site_settings for select to anon, authenticated using (true);
create policy "ss admin" on site_settings for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "cp insert" on complaints for insert to authenticated with check (user_id is null or user_id=auth.uid());
create policy "cp admin" on complaints for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "ya insert" on youth_applications for insert to anon, authenticated with check (exists(select 1 from site_settings where key='youth_open' and value='true'));
create policy "ya admin" on youth_applications for all to authenticated using (is_admin_user()) with check (is_admin_user());
create policy "tl read" on tools for select to authenticated using (true);
create policy "tl admin" on tools for all to authenticated using (is_admin_user()) with check (is_admin_user());
-- خصم/إرجاع المتاح من الأدوات تلقائيًا عند الموافقة على الطلب أو التراجع عنها
create or replace function public.tool_stock() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.tool_id is not null then
    if new.status='approved' and old.status is distinct from 'approved' then update tools set qty_available=greatest(0,qty_available-coalesce(new.tool_qty,1)) where id=new.tool_id;
    elsif old.status='approved' and new.status is distinct from 'approved' then update tools set qty_available=qty_available+coalesce(new.tool_qty,1) where id=new.tool_id; end if;
  end if; return new; end $$;
drop trigger if exists trg_tool_stock on service_requests;
create trigger trg_tool_stock before update on service_requests for each row execute function tool_stock();

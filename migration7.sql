-- ================= migration7 =================
-- شغّله مرة واحدة في Supabase > SQL Editor (آمن لو اتشغل تاني).

-- ===== 1) الخدام بيتشالوا من الجدول تاني يوم الساعة 12 ظهرًا (توقيت القاهرة) =====
create or replace function public.clear_past_assignees() returns void
language sql security definer set search_path = public as $$
  delete from service_assignees a using services s
  where a.service_id = s.id
    and now() >= (((s.service_date + 1) + time '12:00') at time zone 'Africa/Cairo');
$$;
revoke all on function public.clear_past_assignees() from public, anon;
grant execute on function public.clear_past_assignees() to authenticated;
-- اختياري (لو pg_cron متفعّل): تنضيف تلقائي كل ساعة حتى لو محدش فتح الموقع
-- select cron.schedule('clear-past-assignees','0 * * * *','select public.clear_past_assignees()');

-- ===== 2) تكليف خادم بتنفيذ الطلب + أوقات الاستلام والإرجاع =====
-- (من غير references عشان ما يحصلش لخبطة في join بتاع profiles)
alter table service_requests add column if not exists handler_id uuid;
alter table service_requests add column if not exists handler_name text;
alter table service_requests add column if not exists picked_at timestamptz;
alter table service_requests add column if not exists returned_at timestamptz;

-- لو الطلب اتوافق عليه تاني، نصفّر الاستلام والإرجاع
create or replace function public.reset_return() returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.picked_at := null; new.returned_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_reset_return on service_requests;
create trigger trg_reset_return before update on service_requests for each row execute function reset_return();

-- منع رجوع الأدوات مرتين (لو اترجّعت بالزرار وبعدين الطلب اترفض/رجع للانتظار)
create or replace function public.tool_stock() returns trigger language plpgsql security definer set search_path = public as $$
declare it jsonb; sign int := 0;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then sign := -1;
  elsif old.status = 'approved' and new.status is distinct from 'approved' then sign := 1;
  end if;
  if sign = 0 then return new; end if;
  if sign = 1 and old.returned_at is not null then return new; end if;
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

-- ===== 3) زرار "رجّع للمخزن" و"تم الاستلام" (للمسؤول أو الخادم المكلّف بالطلب) =====
create or replace function public.return_tools(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; it jsonb;
begin
  select * into r from service_requests where id = p_request for update;
  if not found then raise exception 'الطلب مش موجود'; end if;
  if not (is_admin_user() or r.handler_id = auth.uid()) then raise exception 'غير مصرح'; end if;
  if r.status <> 'approved' then raise exception 'الطلب لازم يكون موافق عليه'; end if;
  if r.returned_at is not null then return; end if;
  if r.tool_items is not null and jsonb_typeof(r.tool_items) = 'array' then
    for it in select * from jsonb_array_elements(r.tool_items) loop
      update tools set qty_available = least(qty_total - qty_maintenance - qty_broken, qty_available + coalesce((it->>'qty')::int,1))
      where id = (it->>'id')::uuid;
    end loop;
  end if;
  update service_requests set returned_at = now() where id = p_request;
end $$;

create or replace function public.mark_picked(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from service_requests where id = p_request;
  if not found then raise exception 'الطلب مش موجود'; end if;
  if not (is_admin_user() or r.handler_id = auth.uid()) then raise exception 'غير مصرح'; end if;
  update service_requests set picked_at = coalesce(picked_at, now()) where id = p_request;
end $$;

-- ===== 4) الخادم المكلّف يشوف تكليفاته ويرفع صوره =====
create or replace function public.my_handler_tasks()
returns table(id uuid, user_id uuid, tool_items jsonb, needed_at timestamptz, status text,
              member_name text, member_phone text, picked_at timestamptz, returned_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.user_id, r.tool_items, r.needed_at, r.status, p.full_name, p.phone, r.picked_at, r.returned_at
  from service_requests r left join profiles p on p.id = r.user_id
  where r.handler_id = auth.uid() and r.status = 'approved'
    and (r.returned_at is null or r.returned_at > now() - interval '2 days')
  order by r.needed_at;
$$;

revoke all on function public.return_tools(uuid), public.mark_picked(uuid), public.my_handler_tasks() from public, anon;
grant execute on function public.return_tools(uuid), public.mark_picked(uuid), public.my_handler_tasks() to authenticated;

drop policy if exists "rp handler insert" on request_photos;
create policy "rp handler insert" on request_photos for insert to authenticated
with check (user_id = auth.uid() and exists(select 1 from service_requests r where r.id = request_id and r.handler_id = auth.uid() and r.status = 'approved'));

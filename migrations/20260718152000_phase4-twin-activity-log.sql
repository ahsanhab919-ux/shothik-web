create table if not exists public.twin_activity_log (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid not null references public.twins (id) on delete cascade,
  master_identifier text,
  action text not null,
  target_resource text,
  metadata jsonb not null default '{}'::jsonb,
  timestamp_ms bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists twin_activity_log_twin_time_idx
  on public.twin_activity_log (twin_id, timestamp_ms desc);

create index if not exists twin_activity_log_master_time_idx
  on public.twin_activity_log (master_identifier, timestamp_ms desc)
  where master_identifier is not null;

alter table public.twin_activity_log enable row level security;

grant select, insert on public.twin_activity_log to authenticated;

drop policy if exists twin_activity_log_select_owner_or_admin on public.twin_activity_log;
create policy twin_activity_log_select_owner_or_admin
on public.twin_activity_log
for select
to authenticated
using (
  exists (
    select 1
    from public.twins t
    where t.id = twin_activity_log.twin_id
      and (
        t.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists twin_activity_log_insert_owner_or_admin on public.twin_activity_log;
create policy twin_activity_log_insert_owner_or_admin
on public.twin_activity_log
for insert
to authenticated
with check (
  exists (
    select 1
    from public.twins t
    where t.id = twin_activity_log.twin_id
      and (
        t.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

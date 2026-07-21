create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('book', 'research', 'assignment')),
  title text not null,
  template text,
  description text,
  content text not null default '',
  sections jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  word_count integer not null default 0 check (word_count >= 0),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  starred boolean not null default false,
  last_edited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  sections jsonb,
  label text,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists projects_auth_user_last_edited_idx
  on public.projects (auth_user_id, last_edited_at desc);
create index if not exists projects_auth_user_type_last_edited_idx
  on public.projects (auth_user_id, type, last_edited_at desc);
create index if not exists projects_type_last_edited_idx
  on public.projects (type, last_edited_at desc);

create index if not exists project_versions_project_saved_idx
  on public.project_versions (project_id, saved_at desc);
create index if not exists project_versions_auth_user_saved_idx
  on public.project_versions (auth_user_id, saved_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_row_updated_at();

alter table public.projects enable row level security;
alter table public.project_versions enable row level security;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert on public.project_versions to authenticated;

drop policy if exists projects_select_owner on public.projects;
create policy projects_select_owner
on public.projects
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists projects_insert_owner on public.projects;
create policy projects_insert_owner
on public.projects
for insert
to authenticated
with check (auth_user_id = auth.uid());

drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner
on public.projects
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists projects_delete_owner on public.projects;
create policy projects_delete_owner
on public.projects
for delete
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists project_versions_select_owner on public.project_versions;
create policy project_versions_select_owner
on public.project_versions
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists project_versions_insert_owner on public.project_versions;
create policy project_versions_insert_owner
on public.project_versions
for insert
to authenticated
with check (auth_user_id = auth.uid());

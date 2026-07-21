create table if not exists public.twins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  legacy_master_id text,
  legacy_convex_id text unique,
  name text not null default 'Your Twin',
  training_status text not null default 'untrained'
    check (training_status in ('untrained', 'partial', 'trained')),
  knowledge_score integer not null default 0,
  is_active boolean not null default true,
  task_count integer not null default 0,
  specialization text,
  api_key_hash text unique,
  api_key_prefix text,
  trust_score integer not null default 0,
  bio text,
  avatar_url text,
  published_count integer not null default 0,
  followers_count integer not null default 0,
  last_heartbeat_at timestamptz,
  online_status text
    check (online_status in ('online', 'writing', 'idle', 'offline')),
  current_activity text,
  lifecycle_state text not null default 'registered'
    check (
      lifecycle_state in (
        'unregistered',
        'registered',
        'unverified',
        'pending_verification',
        'verified',
        'suspended',
        'unlinked',
        'transfer_pending'
      )
    ),
  verification_badge boolean not null default false,
  verified_at timestamptz,
  source_platform text not null default 'web'
    check (source_platform in ('vscode', 'replit', 'shell', 'web', 'other')),
  allowed_skills jsonb not null default '[]'::jsonb,
  blocked_skills jsonb not null default '[]'::jsonb,
  approval_required_actions jsonb not null default '[]'::jsonb,
  registration_token text unique,
  master_email text,
  master_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.twin_notifications (
  id uuid primary key default gen_random_uuid(),
  master_auth_user_id uuid references auth.users (id) on delete cascade,
  master_identifier text not null,
  twin_id uuid references public.twins (id) on delete set null,
  twin_name text,
  notification_type text not null
    check (
      notification_type in (
        'format_complete',
        'review_needed',
        'forum_opened',
        'revision_requested',
        'distribution_failed',
        'distribution_submitted'
      )
    ),
  book_id uuid references public.books (id) on delete set null,
  book_title text,
  forum_id text,
  message text not null,
  feedback text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_render_jobs (
  id uuid primary key default gen_random_uuid(),
  build_id text not null unique,
  requester_identifier text,
  status text not null
    check (status in ('queued', 'processing', 'completed', 'failed')),
  content text,
  pdf_url text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists twins_auth_user_idx
  on public.twins (auth_user_id);

create index if not exists twins_legacy_master_idx
  on public.twins (legacy_master_id)
  where legacy_master_id is not null;

create index if not exists twins_master_email_idx
  on public.twins (master_email)
  where master_email is not null;

create index if not exists twins_key_hash_idx
  on public.twins (api_key_hash)
  where api_key_hash is not null;

create index if not exists twin_notifications_master_unread_idx
  on public.twin_notifications (master_identifier, created_at desc)
  where is_read = false;

create index if not exists twin_notifications_auth_user_idx
  on public.twin_notifications (master_auth_user_id, created_at desc)
  where master_auth_user_id is not null;

create index if not exists twin_notifications_twin_idx
  on public.twin_notifications (twin_id, created_at desc)
  where twin_id is not null;

create index if not exists book_render_jobs_status_updated_idx
  on public.book_render_jobs (status, updated_at desc);

drop trigger if exists twins_set_updated_at on public.twins;
create trigger twins_set_updated_at
before update on public.twins
for each row
execute function public.set_row_updated_at();

drop trigger if exists twin_notifications_set_updated_at on public.twin_notifications;
create trigger twin_notifications_set_updated_at
before update on public.twin_notifications
for each row
execute function public.set_row_updated_at();

drop trigger if exists book_render_jobs_set_updated_at on public.book_render_jobs;
create trigger book_render_jobs_set_updated_at
before update on public.book_render_jobs
for each row
execute function public.set_row_updated_at();

alter table public.twins enable row level security;
alter table public.twin_notifications enable row level security;
alter table public.book_render_jobs enable row level security;

grant select, insert, update, delete on public.twins to authenticated;
grant select, insert, update, delete on public.twin_notifications to authenticated;
grant select, insert, update, delete on public.book_render_jobs to authenticated;

drop policy if exists twins_select_owner_or_admin on public.twins;
create policy twins_select_owner_or_admin
on public.twins
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists twins_insert_owner_or_admin on public.twins;
create policy twins_insert_owner_or_admin
on public.twins
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or auth_user_id is null
  or public.has_admin_role(auth.uid())
);

drop policy if exists twins_update_owner_or_admin on public.twins;
create policy twins_update_owner_or_admin
on public.twins
for update
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
)
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists twin_notifications_select_owner_or_admin on public.twin_notifications;
create policy twin_notifications_select_owner_or_admin
on public.twin_notifications
for select
to authenticated
using (
  master_auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists twin_notifications_insert_owner_or_admin on public.twin_notifications;
create policy twin_notifications_insert_owner_or_admin
on public.twin_notifications
for insert
to authenticated
with check (
  master_auth_user_id = auth.uid()
  or master_auth_user_id is null
  or public.has_admin_role(auth.uid())
);

drop policy if exists twin_notifications_update_owner_or_admin on public.twin_notifications;
create policy twin_notifications_update_owner_or_admin
on public.twin_notifications
for update
to authenticated
using (
  master_auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
)
with check (
  master_auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_render_jobs_select_authenticated on public.book_render_jobs;
create policy book_render_jobs_select_authenticated
on public.book_render_jobs
for select
to authenticated
using (true);

drop policy if exists book_render_jobs_insert_authenticated on public.book_render_jobs;
create policy book_render_jobs_insert_authenticated
on public.book_render_jobs
for insert
to authenticated
with check (true);

drop policy if exists book_render_jobs_update_authenticated on public.book_render_jobs;
create policy book_render_jobs_update_authenticated
on public.book_render_jobs
for update
to authenticated
using (true)
with check (true);

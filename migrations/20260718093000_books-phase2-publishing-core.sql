create table if not exists public.author_tax_profiles (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  form_type text not null check (form_type in ('W-9', 'W-8BEN')),
  country text not null,
  legal_name text not null,
  tax_id_last4 text,
  tax_id_hash text,
  address text not null,
  city text not null,
  postal_code text not null,
  treaty_benefit boolean not null default false,
  treaty_country text,
  withholding_rate numeric(5,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_distribution_records (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.books (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  job_id text not null,
  publishdrive_book_id text unique,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_distribution_channels (
  id uuid primary key default gen_random_uuid(),
  distribution_record_id uuid not null references public.book_distribution_records (id) on delete cascade,
  channel_id text not null,
  channel_name text not null,
  status text not null check (status in ('pending', 'processing', 'review', 'in_review', 'live', 'failed', 'removed')),
  url text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (distribution_record_id, channel_id)
);

create table if not exists public.book_notifications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists author_tax_profiles_updated_idx
  on public.author_tax_profiles (updated_at desc);

create index if not exists book_distribution_records_user_updated_idx
  on public.book_distribution_records (auth_user_id, updated_at desc);

create index if not exists book_distribution_records_publishdrive_idx
  on public.book_distribution_records (publishdrive_book_id)
  where publishdrive_book_id is not null;

create index if not exists book_distribution_channels_record_updated_idx
  on public.book_distribution_channels (distribution_record_id, updated_at desc);

create index if not exists book_notifications_user_unread_idx
  on public.book_notifications (auth_user_id, created_at desc)
  where read_at is null;

create index if not exists book_notifications_book_created_idx
  on public.book_notifications (book_id, created_at desc);

drop trigger if exists author_tax_profiles_set_updated_at on public.author_tax_profiles;
create trigger author_tax_profiles_set_updated_at
before update on public.author_tax_profiles
for each row
execute function public.set_row_updated_at();

drop trigger if exists book_distribution_records_set_updated_at on public.book_distribution_records;
create trigger book_distribution_records_set_updated_at
before update on public.book_distribution_records
for each row
execute function public.set_row_updated_at();

drop trigger if exists book_notifications_set_updated_at on public.book_notifications;
create trigger book_notifications_set_updated_at
before update on public.book_notifications
for each row
execute function public.set_row_updated_at();

alter table public.author_tax_profiles enable row level security;
alter table public.book_distribution_records enable row level security;
alter table public.book_distribution_channels enable row level security;
alter table public.book_notifications enable row level security;

grant select, insert, update, delete on public.author_tax_profiles to authenticated;
grant select, insert, update, delete on public.book_distribution_records to authenticated;
grant select, insert, update, delete on public.book_distribution_channels to authenticated;
grant select, insert, update, delete on public.book_notifications to authenticated;

drop policy if exists author_tax_profiles_select_self_or_admin on public.author_tax_profiles;
create policy author_tax_profiles_select_self_or_admin
on public.author_tax_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_tax_profiles_insert_self_or_admin on public.author_tax_profiles;
create policy author_tax_profiles_insert_self_or_admin
on public.author_tax_profiles
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_tax_profiles_update_self_or_admin on public.author_tax_profiles;
create policy author_tax_profiles_update_self_or_admin
on public.author_tax_profiles
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

drop policy if exists book_distribution_records_select_owner_or_admin on public.book_distribution_records;
create policy book_distribution_records_select_owner_or_admin
on public.book_distribution_records
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_distribution_records_insert_owner_or_admin on public.book_distribution_records;
create policy book_distribution_records_insert_owner_or_admin
on public.book_distribution_records
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_distribution_records_update_owner_or_admin on public.book_distribution_records;
create policy book_distribution_records_update_owner_or_admin
on public.book_distribution_records
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

drop policy if exists book_distribution_channels_select_owner_or_admin on public.book_distribution_channels;
create policy book_distribution_channels_select_owner_or_admin
on public.book_distribution_channels
for select
to authenticated
using (
  exists (
    select 1
    from public.book_distribution_records r
    where r.id = book_distribution_channels.distribution_record_id
      and (
        r.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_distribution_channels_insert_owner_or_admin on public.book_distribution_channels;
create policy book_distribution_channels_insert_owner_or_admin
on public.book_distribution_channels
for insert
to authenticated
with check (
  exists (
    select 1
    from public.book_distribution_records r
    where r.id = book_distribution_channels.distribution_record_id
      and (
        r.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_distribution_channels_update_owner_or_admin on public.book_distribution_channels;
create policy book_distribution_channels_update_owner_or_admin
on public.book_distribution_channels
for update
to authenticated
using (
  exists (
    select 1
    from public.book_distribution_records r
    where r.id = book_distribution_channels.distribution_record_id
      and (
        r.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.book_distribution_records r
    where r.id = book_distribution_channels.distribution_record_id
      and (
        r.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_distribution_channels_delete_owner_or_admin on public.book_distribution_channels;
create policy book_distribution_channels_delete_owner_or_admin
on public.book_distribution_channels
for delete
to authenticated
using (
  exists (
    select 1
    from public.book_distribution_records r
    where r.id = book_distribution_channels.distribution_record_id
      and (
        r.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_notifications_select_owner_or_admin on public.book_notifications;
create policy book_notifications_select_owner_or_admin
on public.book_notifications
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_notifications_insert_owner_or_admin on public.book_notifications;
create policy book_notifications_insert_owner_or_admin
on public.book_notifications
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_notifications_update_owner_or_admin on public.book_notifications;
create policy book_notifications_update_owner_or_admin
on public.book_notifications
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

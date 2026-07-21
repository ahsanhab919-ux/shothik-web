create extension if not exists pgcrypto;

create table if not exists public.admin_roles (
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('book_admin', 'platform_admin')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (auth_user_id, role)
);

create or replace function public.has_admin_role(target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_roles
    where auth_user_id = target_user_id
  );
$$;

grant execute on function public.has_admin_role(uuid) to authenticated;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  legacy_user_id text,
  source_project_id uuid,
  legacy_project_id text,
  title text not null default 'Untitled Book',
  subtitle text,
  description text,
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'approved', 'published', 'rejected', 'unpublished')
  ),
  engine_status text,
  language text not null default 'en',
  category text,
  subcategory text,
  keywords text[] not null default '{}',
  price_display numeric(12,2) not null default 9.99 check (price_display >= 0),
  currency_code text not null default 'USD',
  price_credits integer not null default 0 check (price_credits >= 0),
  completed_steps text[] not null default '{}',
  current_step integer not null default 0 check (current_step >= 0),
  agreement_accepted boolean not null default false,
  agreement_name text not null default '',
  agreement_scrolled boolean not null default false,
  distribution_opt_in boolean not null default false,
  google_play_url text,
  isbn text,
  rejection_reason text,
  rejection_category text,
  review_notes text,
  reviewed_by_auth_user_id uuid references auth.users (id) on delete set null,
  reviewed_by_label text,
  resubmission_count integer not null default 0 check (resubmission_count >= 0),
  sales_count integer not null default 0 check (sales_count >= 0),
  total_earned_credits integer not null default 0 check (total_earned_credits >= 0),
  draft_created_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  rejected_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_assets (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  asset_kind text not null check (asset_kind in ('manuscript', 'cover')),
  bucket text not null,
  storage_key text not null,
  url text not null,
  mime_type text,
  byte_size bigint,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, asset_kind)
);

create table if not exists public.book_moderation_events (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  actor_auth_user_id uuid references auth.users (id) on delete set null,
  event_type text not null check (
    event_type in ('created', 'updated', 'submitted', 'resubmitted', 'approved', 'rejected', 'published', 'unpublished', 'price_updated')
  ),
  from_status text,
  to_status text,
  reason text,
  category text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_purchased integer not null default 0 check (total_purchased >= 0),
  total_spent integer not null default 0 check (total_spent >= 0),
  total_received integer not null default 0 check (total_received >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  transaction_type text not null check (
    transaction_type in ('credit_purchase', 'book_purchase', 'book_sale', 'admin_adjustment')
  ),
  amount integer not null,
  balance_after integer,
  description text not null,
  provider_payment_id text,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_transactions_provider_payment_unique
  on public.credit_transactions (auth_user_id, provider_payment_id, transaction_type)
  where provider_payment_id is not null;

create table if not exists public.book_purchases (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  buyer_auth_user_id uuid not null references auth.users (id) on delete cascade,
  seller_auth_user_id uuid not null references auth.users (id) on delete restrict,
  credits_charged integer not null check (credits_charged >= 0),
  creator_credits integer not null check (creator_credits >= 0),
  platform_credits integer not null check (platform_credits >= 0),
  created_at timestamptz not null default now(),
  unique (book_id, buyer_auth_user_id)
);

create table if not exists public.book_library_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  purchase_id uuid references public.book_purchases (id) on delete set null,
  access_source text not null check (
    access_source in ('author', 'purchase', 'free', 'admin')
  ),
  created_at timestamptz not null default now(),
  unique (book_id, auth_user_id)
);

create index if not exists admin_roles_auth_user_idx
  on public.admin_roles (auth_user_id);

create index if not exists books_auth_user_idx
  on public.books (auth_user_id);
create index if not exists books_auth_user_status_idx
  on public.books (auth_user_id, status, updated_at desc);
create index if not exists books_status_published_idx
  on public.books (status, published_at desc nulls last, created_at desc);
create index if not exists books_category_status_idx
  on public.books (category, status);

create index if not exists book_assets_book_kind_idx
  on public.book_assets (book_id, asset_kind);

create index if not exists book_moderation_events_book_created_idx
  on public.book_moderation_events (book_id, created_at desc);

create index if not exists user_credits_auth_user_idx
  on public.user_credits (auth_user_id);

create index if not exists credit_transactions_auth_user_created_idx
  on public.credit_transactions (auth_user_id, created_at desc);

create index if not exists book_purchases_buyer_created_idx
  on public.book_purchases (buyer_auth_user_id, created_at desc);
create index if not exists book_purchases_seller_created_idx
  on public.book_purchases (seller_auth_user_id, created_at desc);
create index if not exists book_purchases_book_created_idx
  on public.book_purchases (book_id, created_at desc);

create index if not exists book_library_entries_auth_user_created_idx
  on public.book_library_entries (auth_user_id, created_at desc);

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row
execute function public.set_row_updated_at();

drop trigger if exists book_assets_set_updated_at on public.book_assets;
create trigger book_assets_set_updated_at
before update on public.book_assets
for each row
execute function public.set_row_updated_at();

drop trigger if exists user_credits_set_updated_at on public.user_credits;
create trigger user_credits_set_updated_at
before update on public.user_credits
for each row
execute function public.set_row_updated_at();

alter table public.admin_roles enable row level security;
alter table public.books enable row level security;
alter table public.book_assets enable row level security;
alter table public.book_moderation_events enable row level security;
alter table public.user_credits enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.book_purchases enable row level security;
alter table public.book_library_entries enable row level security;

grant select, insert, update, delete on public.admin_roles to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.book_assets to authenticated;
grant select, insert, update, delete on public.book_moderation_events to authenticated;
grant select, insert, update, delete on public.user_credits to authenticated;
grant select, insert, update, delete on public.credit_transactions to authenticated;
grant select, insert, update, delete on public.book_purchases to authenticated;
grant select, insert, update, delete on public.book_library_entries to authenticated;

drop policy if exists admin_roles_select_self_or_admin on public.admin_roles;
create policy admin_roles_select_self_or_admin
on public.admin_roles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists admin_roles_manage_admin on public.admin_roles;
create policy admin_roles_manage_admin
on public.admin_roles
for all
to authenticated
using (public.has_admin_role(auth.uid()))
with check (public.has_admin_role(auth.uid()));

drop policy if exists books_select_owner_published_or_admin on public.books;
create policy books_select_owner_published_or_admin
on public.books
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or status = 'published'
  or public.has_admin_role(auth.uid())
);

drop policy if exists books_insert_owner on public.books;
create policy books_insert_owner
on public.books
for insert
to authenticated
with check (auth_user_id = auth.uid());

drop policy if exists books_update_owner_or_admin on public.books;
create policy books_update_owner_or_admin
on public.books
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

drop policy if exists books_delete_owner_or_admin on public.books;
create policy books_delete_owner_or_admin
on public.books
for delete
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_assets_select_owner_or_admin on public.book_assets;
create policy book_assets_select_owner_or_admin
on public.book_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.books b
    where b.id = book_assets.book_id
      and (
        b.auth_user_id = auth.uid()
        or b.status = 'published'
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_assets_insert_owner_or_admin on public.book_assets;
create policy book_assets_insert_owner_or_admin
on public.book_assets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.books b
    where b.id = book_assets.book_id
      and (
        b.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_assets_update_owner_or_admin on public.book_assets;
create policy book_assets_update_owner_or_admin
on public.book_assets
for update
to authenticated
using (
  exists (
    select 1
    from public.books b
    where b.id = book_assets.book_id
      and (
        b.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.books b
    where b.id = book_assets.book_id
      and (
        b.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_assets_delete_owner_or_admin on public.book_assets;
create policy book_assets_delete_owner_or_admin
on public.book_assets
for delete
to authenticated
using (
  exists (
    select 1
    from public.books b
    where b.id = book_assets.book_id
      and (
        b.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_moderation_events_select_owner_or_admin on public.book_moderation_events;
create policy book_moderation_events_select_owner_or_admin
on public.book_moderation_events
for select
to authenticated
using (
  exists (
    select 1
    from public.books b
    where b.id = book_moderation_events.book_id
      and (
        b.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_moderation_events_insert_owner_or_admin on public.book_moderation_events;
create policy book_moderation_events_insert_owner_or_admin
on public.book_moderation_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.books b
    where b.id = book_moderation_events.book_id
      and (
        b.auth_user_id = auth.uid()
        or public.has_admin_role(auth.uid())
      )
  )
);

drop policy if exists book_moderation_events_manage_admin on public.book_moderation_events;
create policy book_moderation_events_manage_admin
on public.book_moderation_events
for update
to authenticated
using (public.has_admin_role(auth.uid()))
with check (public.has_admin_role(auth.uid()));

drop policy if exists user_credits_select_self_or_admin on public.user_credits;
create policy user_credits_select_self_or_admin
on public.user_credits
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists user_credits_insert_self_or_admin on public.user_credits;
create policy user_credits_insert_self_or_admin
on public.user_credits
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists user_credits_update_self_or_admin on public.user_credits;
create policy user_credits_update_self_or_admin
on public.user_credits
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

drop policy if exists credit_transactions_select_self_or_admin on public.credit_transactions;
create policy credit_transactions_select_self_or_admin
on public.credit_transactions
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists credit_transactions_insert_self_or_admin on public.credit_transactions;
create policy credit_transactions_insert_self_or_admin
on public.credit_transactions
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_purchases_select_owner_or_admin on public.book_purchases;
create policy book_purchases_select_owner_or_admin
on public.book_purchases
for select
to authenticated
using (
  buyer_auth_user_id = auth.uid()
  or seller_auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_purchases_insert_owner_or_admin on public.book_purchases;
create policy book_purchases_insert_owner_or_admin
on public.book_purchases
for insert
to authenticated
with check (
  buyer_auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_library_entries_select_owner_or_admin on public.book_library_entries;
create policy book_library_entries_select_owner_or_admin
on public.book_library_entries
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_library_entries_insert_owner_or_admin on public.book_library_entries;
create policy book_library_entries_insert_owner_or_admin
on public.book_library_entries
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_library_entries_update_owner_or_admin on public.book_library_entries;
create policy book_library_entries_update_owner_or_admin
on public.book_library_entries
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

drop policy if exists storage_objects_owner_select on storage.objects;
drop policy if exists storage_objects_owner_insert on storage.objects;
drop policy if exists storage_objects_owner_update on storage.objects;
drop policy if exists storage_objects_owner_delete on storage.objects;

drop policy if exists storage_book_manuscripts_path_select on storage.objects;
create policy storage_book_manuscripts_path_select on storage.objects
  for select to authenticated
  using (
    bucket = 'book-manuscripts'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists storage_book_manuscripts_path_insert on storage.objects;
create policy storage_book_manuscripts_path_insert on storage.objects
  for insert to authenticated
  with check (
    bucket = 'book-manuscripts'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists storage_book_manuscripts_path_update on storage.objects;
create policy storage_book_manuscripts_path_update on storage.objects
  for update to authenticated
  using (
    bucket = 'book-manuscripts'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket = 'book-manuscripts'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists storage_book_manuscripts_path_delete on storage.objects;
create policy storage_book_manuscripts_path_delete on storage.objects
  for delete to authenticated
  using (
    bucket = 'book-manuscripts'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists storage_book_covers_public_read on storage.objects;
create policy storage_book_covers_public_read on storage.objects
  for select to authenticated, anon
  using (bucket = 'book-covers');

drop policy if exists storage_book_covers_path_insert on storage.objects;
create policy storage_book_covers_path_insert on storage.objects
  for insert to authenticated
  with check (
    bucket = 'book-covers'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists storage_book_covers_path_update on storage.objects;
create policy storage_book_covers_path_update on storage.objects
  for update to authenticated
  using (
    bucket = 'book-covers'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket = 'book-covers'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists storage_book_covers_path_delete on storage.objects;
create policy storage_book_covers_path_delete on storage.objects
  for delete to authenticated
  using (
    bucket = 'book-covers'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

grant select, insert, update, delete on storage.objects to authenticated;
grant usage on schema storage to authenticated;
grant select on storage.objects to anon;
grant usage on schema storage to anon;

create table if not exists public.book_sales_records (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null,
  period text not null,
  units_sold integer not null check (units_sold >= 0),
  gross_revenue numeric(12,2) not null check (gross_revenue >= 0),
  net_revenue numeric(12,2) not null check (net_revenue >= 0),
  royalty_amount numeric(12,2) not null check (royalty_amount >= 0),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.author_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  method text not null check (method in ('stripe', 'payoneer', 'bank_transfer')),
  is_default boolean not null default false,
  stripe_connect_account_id text,
  stripe_onboarding_complete boolean not null default false,
  payoneer_account_email text,
  payoneer_payee_id text,
  bank_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, method)
);

create table if not exists public.author_payouts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  method text not null check (method in ('stripe', 'payoneer', 'bank_transfer')),
  stripe_transfer_id text,
  stripe_account_id text,
  estimated_arrival timestamptz,
  processed_at timestamptz,
  period_start text not null,
  period_end text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists author_payouts_stripe_transfer_unique
  on public.author_payouts (stripe_transfer_id)
  where stripe_transfer_id is not null;

create index if not exists book_sales_records_user_recorded_idx
  on public.book_sales_records (auth_user_id, recorded_at desc);

create index if not exists book_sales_records_book_recorded_idx
  on public.book_sales_records (book_id, recorded_at desc);

create index if not exists book_sales_records_period_idx
  on public.book_sales_records (auth_user_id, period desc);

create index if not exists author_payout_accounts_user_updated_idx
  on public.author_payout_accounts (auth_user_id, updated_at desc);

create index if not exists author_payouts_user_created_idx
  on public.author_payouts (auth_user_id, created_at desc);

create index if not exists author_payouts_user_status_idx
  on public.author_payouts (auth_user_id, status, updated_at desc);

drop trigger if exists book_sales_records_set_updated_at on public.book_sales_records;
create trigger book_sales_records_set_updated_at
before update on public.book_sales_records
for each row
execute function public.set_row_updated_at();

drop trigger if exists author_payout_accounts_set_updated_at on public.author_payout_accounts;
create trigger author_payout_accounts_set_updated_at
before update on public.author_payout_accounts
for each row
execute function public.set_row_updated_at();

drop trigger if exists author_payouts_set_updated_at on public.author_payouts;
create trigger author_payouts_set_updated_at
before update on public.author_payouts
for each row
execute function public.set_row_updated_at();

alter table public.book_sales_records enable row level security;
alter table public.author_payout_accounts enable row level security;
alter table public.author_payouts enable row level security;

grant select, insert, update, delete on public.book_sales_records to authenticated;
grant select, insert, update, delete on public.author_payout_accounts to authenticated;
grant select, insert, update, delete on public.author_payouts to authenticated;

drop policy if exists book_sales_records_select_owner_or_admin on public.book_sales_records;
create policy book_sales_records_select_owner_or_admin
on public.book_sales_records
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_sales_records_insert_owner_or_admin on public.book_sales_records;
create policy book_sales_records_insert_owner_or_admin
on public.book_sales_records
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists book_sales_records_update_owner_or_admin on public.book_sales_records;
create policy book_sales_records_update_owner_or_admin
on public.book_sales_records
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

drop policy if exists author_payout_accounts_select_owner_or_admin on public.author_payout_accounts;
create policy author_payout_accounts_select_owner_or_admin
on public.author_payout_accounts
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_payout_accounts_insert_owner_or_admin on public.author_payout_accounts;
create policy author_payout_accounts_insert_owner_or_admin
on public.author_payout_accounts
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_payout_accounts_update_owner_or_admin on public.author_payout_accounts;
create policy author_payout_accounts_update_owner_or_admin
on public.author_payout_accounts
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

drop policy if exists author_payout_accounts_delete_owner_or_admin on public.author_payout_accounts;
create policy author_payout_accounts_delete_owner_or_admin
on public.author_payout_accounts
for delete
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_payouts_select_owner_or_admin on public.author_payouts;
create policy author_payouts_select_owner_or_admin
on public.author_payouts
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_payouts_insert_owner_or_admin on public.author_payouts;
create policy author_payouts_insert_owner_or_admin
on public.author_payouts
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or public.has_admin_role(auth.uid())
);

drop policy if exists author_payouts_update_owner_or_admin on public.author_payouts;
create policy author_payouts_update_owner_or_admin
on public.author_payouts
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

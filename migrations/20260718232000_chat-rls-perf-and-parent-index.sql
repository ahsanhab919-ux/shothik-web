create index if not exists chat_messages_parent_message_idx
  on public.chat_messages (parent_message_id);

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
drop policy if exists "chat_messages_update_own" on public.chat_messages;
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
drop policy if exists "chat_messages_select_own" on public.chat_messages;
drop policy if exists "chat_conversations_delete_own" on public.chat_conversations;
drop policy if exists "chat_conversations_update_own" on public.chat_conversations;
drop policy if exists "chat_conversations_insert_own" on public.chat_conversations;
drop policy if exists "chat_conversations_select_own" on public.chat_conversations;

create policy "chat_conversations_select_own"
on public.chat_conversations
for select
to authenticated
using (auth_user_id = (select auth.uid()));

create policy "chat_conversations_insert_own"
on public.chat_conversations
for insert
to authenticated
with check (auth_user_id = (select auth.uid()));

create policy "chat_conversations_update_own"
on public.chat_conversations
for update
to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

create policy "chat_conversations_delete_own"
on public.chat_conversations
for delete
to authenticated
using (auth_user_id = (select auth.uid()));

create policy "chat_messages_select_own"
on public.chat_messages
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "chat_messages_insert_own"
on public.chat_messages
for insert
to authenticated
with check (
  auth_user_id = (select auth.uid())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "chat_messages_update_own"
on public.chat_messages
for update
to authenticated
using (
  auth_user_id = (select auth.uid())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
)
with check (
  auth_user_id = (select auth.uid())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "chat_messages_delete_own"
on public.chat_messages
for delete
to authenticated
using (
  auth_user_id = (select auth.uid())
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

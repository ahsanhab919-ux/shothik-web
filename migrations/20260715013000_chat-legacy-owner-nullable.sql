alter table public.chat_conversations
  alter column legacy_user_id drop not null;

alter table public.chat_messages
  alter column legacy_user_id drop not null;

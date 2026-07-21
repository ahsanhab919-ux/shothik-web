update public.chat_messages m
set auth_user_id = c.auth_user_id
from public.chat_conversations c
where c.id = m.conversation_id
  and c.auth_user_id is not null
  and m.auth_user_id is distinct from c.auth_user_id;

alter table public.chat_conversations
  drop constraint if exists chat_conversations_id_auth_user_unique;

alter table public.chat_conversations
  add constraint chat_conversations_id_auth_user_unique
  unique (id, auth_user_id);

alter table public.chat_messages
  drop constraint if exists chat_messages_conversation_owner_fkey;

alter table public.chat_messages
  add constraint chat_messages_conversation_owner_fkey
  foreign key (conversation_id, auth_user_id)
  references public.chat_conversations (id, auth_user_id)
  on update cascade
  on delete cascade
  not valid;

alter table public.chat_messages
  validate constraint chat_messages_conversation_owner_fkey;

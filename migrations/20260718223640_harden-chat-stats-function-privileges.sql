alter function public.sync_chat_conversation_stats(uuid) security invoker;
revoke execute on function public.sync_chat_conversation_stats(uuid) from public;
grant execute on function public.sync_chat_conversation_stats(uuid) to project_admin;

alter function public.sync_chat_conversation_stats_trigger() security invoker;
revoke execute on function public.sync_chat_conversation_stats_trigger() from public;
grant execute on function public.sync_chat_conversation_stats_trigger() to project_admin;

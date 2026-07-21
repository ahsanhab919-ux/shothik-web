alter table public.projects
  add column if not exists research_notes jsonb,
  add column if not exists agent_chapters jsonb;

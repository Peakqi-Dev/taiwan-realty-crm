-- Add line_id column to agent_profiles: the agent's *personal* LINE ID
-- (for customer-facing "聯絡業務" → "加我 LINE" link), distinct from the
-- bot's binding line_user_id in public.line_bindings.
alter table public.agent_profiles
  add column if not exists line_id text not null default '';

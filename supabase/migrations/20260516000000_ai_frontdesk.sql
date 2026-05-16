-- ==================================================================
-- AI Front-Desk: shared bot serves agents AND their customers.
--
-- Adds:
--   agent_profiles      — public-facing info for an agent (short_code, name)
--   customer_pairings   — pending QR-scan → customer line_user_id mapping
--   customers           — customers belonging to an agent
--   conversations       — agent ↔ customer chat session
--   messages            — every inbound/outbound message in a conversation
--
-- The shared LINE bot looks up customer_pairings on follow / line_bindings
-- on follow to decide which role this LINE user has.
-- ==================================================================

-- ------------------------------------------------------------------
-- agent_profiles: an agent's customer-facing identity.
-- short_code is a 6-char URL-safe slug used in /r/<code> QR landing.
-- ------------------------------------------------------------------
create table public.agent_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  short_code   text        not null unique,
  display_name text        not null,
  phone        text        not null default '',
  photo_url    text,
  bio          text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint agent_profiles_short_code_format check (short_code ~ '^[a-z0-9]{6,12}$')
);

create index agent_profiles_short_code_idx on public.agent_profiles (short_code);

alter table public.agent_profiles enable row level security;

-- An agent reads and edits only their own profile.
create policy "agent_profiles: owner can read"
  on public.agent_profiles for select
  using (user_id = auth.uid());

create policy "agent_profiles: owner can update"
  on public.agent_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "agent_profiles: owner can insert"
  on public.agent_profiles for insert
  with check (user_id = auth.uid());

-- Backfill for existing line_bindings users (auto-onboarded agents).
-- short_code: take the first 8 hex chars of the user_id (collision-safe at
-- this scale; constraint allows up to 12 chars).
insert into public.agent_profiles (user_id, short_code, display_name)
select
  lb.user_id,
  substr(replace(lb.user_id::text, '-', ''), 1, 8) as short_code,
  coalesce(u.raw_user_meta_data->>'name', 'LeadFlow 業務') as display_name
from public.line_bindings lb
join auth.users u on u.id = lb.user_id
on conflict (user_id) do nothing;

-- ------------------------------------------------------------------
-- customer_pairings: written when a customer visits /r/<short_code> +
-- successfully completes the LIFF customer-id capture step. Webhook reads
-- this when a `follow` event arrives to decide the user is a customer.
-- One row per agent-customer pair; an existing row is upserted on re-visit.
-- bound_at flips from null → now() once the follow event consumes it.
-- ------------------------------------------------------------------
create table public.customer_pairings (
  id                    uuid primary key default gen_random_uuid(),
  customer_line_user_id text        not null,
  agent_user_id         uuid        not null references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  bound_at              timestamptz,
  constraint customer_pairings_unique unique (customer_line_user_id, agent_user_id)
);

create index customer_pairings_customer_idx
  on public.customer_pairings (customer_line_user_id, bound_at);

alter table public.customer_pairings enable row level security;
-- No agent-facing policies: writes come from the LIFF backend (service role)
-- and the webhook (service role). Reads from dashboards go via customers/
-- conversations, not this transient table.

-- ------------------------------------------------------------------
-- customers: the actual people the bot serves on behalf of an agent.
-- An agent owns the customer; a customer can in principle later belong to
-- a different agent if they re-scan a different QR (we keep the latest).
-- ------------------------------------------------------------------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  line_user_id  text        not null unique,
  display_name  text        not null default 'LINE 用戶',
  picture_url   text,
  agent_user_id uuid        not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index customers_agent_idx on public.customers (agent_user_id, last_seen_at desc);

alter table public.customers enable row level security;

create policy "customers: agent owns row"
  on public.customers for all
  using  (agent_user_id = auth.uid())
  with check (agent_user_id = auth.uid());

-- ------------------------------------------------------------------
-- conversation_status: lifecycle of an AI-assisted chat thread.
-- ------------------------------------------------------------------
create type conversation_status as enum ('ai', 'needs_agent', 'agent_handling', 'resolved');

-- ------------------------------------------------------------------
-- conversations: one per agent-customer pair.
-- ------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  agent_user_id   uuid                not null references auth.users(id) on delete cascade,
  customer_id     uuid                not null references public.customers(id) on delete cascade,
  status          conversation_status not null default 'ai',
  last_message_at timestamptz         not null default now(),
  unread_count    integer             not null default 0 check (unread_count >= 0),
  created_at      timestamptz         not null default now(),
  constraint conversations_unique unique (agent_user_id, customer_id)
);

create index conversations_agent_recent_idx
  on public.conversations (agent_user_id, last_message_at desc);

alter table public.conversations enable row level security;

create policy "conversations: agent owns row"
  on public.conversations for all
  using  (agent_user_id = auth.uid())
  with check (agent_user_id = auth.uid());

-- ------------------------------------------------------------------
-- message_sender: who sent a given message.
-- ------------------------------------------------------------------
create type message_sender as enum ('customer', 'ai', 'agent');

-- ------------------------------------------------------------------
-- messages: every line of the chat. The webhook writes 'customer' + 'ai';
-- the dashboard reply path writes 'agent' (and also pushes to LINE).
-- ------------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid           not null references public.conversations(id) on delete cascade,
  sender_type     message_sender not null,
  text            text           not null,
  created_at      timestamptz    not null default now()
);

create index messages_conversation_time_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages: visible to conversation agent"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.agent_user_id = auth.uid()
    )
  );

-- Writes go through service role (webhook / server actions); no insert policy.

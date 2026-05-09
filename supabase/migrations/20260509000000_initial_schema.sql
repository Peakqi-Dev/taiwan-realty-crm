-- Initial schema for Taiwan Realty CRM
-- Mirrors lib/types.ts. Each row is owned by an auth.users record (single-agent MVP).
-- Future: tighten owner_id FKs and broaden RLS for team mode.

-- ------------------------------------------------------------------
-- Enums (mirror the TS unions in lib/types.ts)
-- ------------------------------------------------------------------

create type property_status as enum ('委託中', '帶看中', '議價中', '成交', '解除委託');
create type property_type   as enum ('買賣', '租賃');

create type client_type   as enum ('買方', '賣方', '租客', '房東');
create type client_status as enum ('新客戶', '追蹤中', '帶看', '議價', '成交', '流失');

create type interaction_type as enum ('電話', '帶看', 'LINE', '成交', '其他');

create type reminder_type as enum ('追蹤客戶', '委託到期', '帶看行程', '自訂');

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

create table public.properties (
  id                    uuid primary key default gen_random_uuid(),
  title                 text            not null,
  address               text            not null,
  district              text            not null,
  price                 integer         not null check (price >= 0),  -- 萬元
  type                  property_type   not null,
  rooms                 integer         not null default 0 check (rooms >= 0),
  bathrooms             integer         not null default 0 check (bathrooms >= 0),
  area                  numeric(8,2)    not null default 0 check (area >= 0), -- 坪
  floor                 text            not null default '',
  total_floors          integer         not null default 0 check (total_floors >= 0),
  status                property_status not null default '委託中',
  commission_deadline   date            not null,
  description           text            not null default '',
  images                text[]          not null default '{}',
  owner_id              uuid            not null references auth.users(id) on delete cascade,
  created_at            timestamptz     not null default now(),
  updated_at            timestamptz     not null default now()
);

create index properties_owner_idx              on public.properties (owner_id);
create index properties_status_idx             on public.properties (status);
create index properties_commission_deadline_idx on public.properties (commission_deadline);

create table public.clients (
  id                   uuid primary key default gen_random_uuid(),
  name                 text          not null,
  phone                text          not null,
  line_id              text,
  type                 client_type   not null,
  status               client_status not null default '新客戶',
  budget_min           integer       check (budget_min >= 0),                -- 萬元
  budget_max           integer       check (budget_max >= 0),                -- 萬元
  preferred_districts  text[]        not null default '{}',
  requirements         text          not null default '',
  assigned_to          uuid          not null references auth.users(id) on delete cascade,
  last_contact_at      timestamptz   not null default now(),
  created_at           timestamptz   not null default now(),
  constraint clients_budget_range check (budget_min is null or budget_max is null or budget_min <= budget_max)
);

create index clients_assigned_idx on public.clients (assigned_to);
create index clients_status_idx   on public.clients (status);

create table public.interactions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id)    on delete cascade,
  property_id uuid          references public.properties(id) on delete set null,
  type        interaction_type not null,
  note        text not null default '',
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index interactions_client_idx   on public.interactions (client_id, created_at desc);
create index interactions_property_idx on public.interactions (property_id);

create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  type       reminder_type not null,
  title      text not null,
  target_id  uuid,                                  -- client_id or property_id (loose FK; resolved client-side)
  remind_at  timestamptz not null,
  is_done    boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade
);

create index reminders_owner_due_idx on public.reminders (created_by, is_done, remind_at);

-- ------------------------------------------------------------------
-- Trigger: keep properties.updated_at fresh
-- ------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger properties_touch_updated_at
  before update on public.properties
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security
-- Single-agent MVP: a row is visible/mutable iff the agent owns it.
-- Owner column varies per table; alias via the predicate below.
-- ------------------------------------------------------------------

alter table public.properties   enable row level security;
alter table public.clients      enable row level security;
alter table public.interactions enable row level security;
alter table public.reminders    enable row level security;

-- properties.owner_id
create policy "properties: agent owns row"
  on public.properties for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- clients.assigned_to
create policy "clients: agent owns row"
  on public.clients for all
  using  (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- interactions.created_by + parent client must also belong to the user
create policy "interactions: agent owns row"
  on public.interactions for all
  using  (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.assigned_to = auth.uid()
    )
  );

-- reminders.created_by
create policy "reminders: agent owns row"
  on public.reminders for all
  using  (created_by = auth.uid())
  with check (created_by = auth.uid());

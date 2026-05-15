-- Feedback captured from the LINE「意見回饋」 menu button.
-- Triggered when a user clicks the menu, the next message they send lands here.

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  line_user_id  text not null,
  user_id       uuid references auth.users(id) on delete set null,
  message       text not null,
  source        text not null default 'line_menu',
  created_at    timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);

-- Server-side only — no RLS policy means anon clients can't touch this.
alter table public.feedback enable row level security;

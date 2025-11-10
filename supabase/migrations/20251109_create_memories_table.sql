-- Migration: Create memories table for conversational memory and reminders
-- Usage:
-- 1. Open the Supabase SQL editor for your project:
--    https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- 2. Copy and paste the contents of this file.
-- 3. Execute the SQL.
-- 4. Replace YOUR_PROJECT with your Supabase project ID when running manually via psql if desired.

set search_path = public;

create extension if not exists pgcrypto;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  natural_text text not null,
  structured_payload jsonb,
  tags text[] not null default '{}',
  amount numeric,
  currency text,
  event_date timestamptz,
  remind_at timestamptz,
  recurrence jsonb,
  source text default 'chat',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  is_active boolean not null default true
);

comment on table public.memories is 'Stores conversational memories, tagged notes, and reminders captured from the chat assistant.';

create index if not exists memories_user_created_idx on public.memories (user_id, created_at desc);
create index if not exists memories_user_event_date_idx on public.memories (user_id, event_date desc);
create index if not exists memories_tags_idx on public.memories using gin (tags);
create index if not exists memories_user_remind_at_idx on public.memories (user_id, remind_at) where remind_at is not null;

-- Update trigger to maintain updated_at
create or replace function public.set_memories_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists memories_updated_at_trigger on public.memories;

create trigger memories_updated_at_trigger
before update on public.memories
for each row execute function public.set_memories_updated_at();



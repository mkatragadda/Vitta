-- Liquibase-style SQL for the memories table
-- Usage: apply through Supabase SQL Editor or psql

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
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.memories is
  'Stores conversational memories, tagged notes, and reminders captured from the chat assistant.';

create index if not exists memories_user_created_idx on public.memories (user_id, created_at desc);
create index if not exists memories_user_event_date_idx on public.memories (user_id, event_date desc);
create index if not exists memories_tags_idx on public.memories using gin (tags);
create index if not exists memories_user_remind_at_idx on public.memories (user_id, remind_at) where remind_at is not null;

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



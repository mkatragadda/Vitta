-- Liquibase-style SQL for payment reminders
-- Apply through Supabase SQL Editor or psql

set search_path = public;

create extension if not exists pgcrypto;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid,
  reminder_type text not null default 'payment_due',
  trigger_date date not null,
  target_datetime timestamptz not null,
  lead_time_days integer not null default 0,
  channel text[] not null default array['in_app'],
  status text not null default 'scheduled',
  priority integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  muted_until timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.reminders is
  'Stores scheduled notification plans for upcoming credit card payments and other reminder types.';

create index if not exists reminders_user_target_idx on public.reminders (user_id, target_datetime);
create index if not exists reminders_user_status_idx on public.reminders (user_id, status);
create index if not exists reminders_card_idx on public.reminders (card_id);

create or replace function public.set_reminders_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists reminders_updated_at_trigger on public.reminders;

create trigger reminders_updated_at_trigger
before update on public.reminders
for each row execute function public.set_reminders_updated_at();





-- Fix foreign key on intent_logs.user_id to reference app users table
-- Reason: App uses public.users, not auth.users, for user IDs

alter table if exists intent_logs
  drop constraint if exists intent_logs_user_id_fkey;

alter table if exists intent_logs
  add constraint intent_logs_user_fk
  foreign key (user_id) references public.users(id)
  on delete set null;

-- Optional: ensure type is uuid (no-op if already uuid)
alter table if exists intent_logs
  alter column user_id type uuid using user_id::uuid;

comment on constraint intent_logs_user_fk on intent_logs is 'FK to public.users(id); allows null; set null on delete';


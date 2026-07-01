-- ============================================================
-- Zair Zabar POS — email verification + admin approval
-- Run in Supabase > SQL Editor. Idempotent.
-- ============================================================

alter table users add column if not exists email_verified boolean not null default false;
alter table users add column if not exists approved       boolean not null default false;

-- Keep all EXISTING users able to log in (mark them verified + approved).
update users set email_verified = true, approved = true;

NOTIFY pgrst, 'reload schema';
a
-- ============================================================
-- Zair Zabar POS — Database hardening
-- Run in: Supabase Dashboard > SQL Editor. Safe to re-run.
-- ============================================================

-- 1) Enable Row Level Security on every table.
--    The Express backend uses the SERVICE ROLE key, which BYPASSES RLS,
--    so the app keeps working. But with RLS on and NO policies, the public
--    "anon" key (and any leaked client key) gets ZERO access. Defense in depth.
alter table users            enable row level security;
alter table tables           enable row level security;
alter table orders           enable row level security;
alter table payments         enable row level security;
alter table pending_payments enable row level security;
alter table sessions         enable row level security;

-- (Intentionally no policies for anon/authenticated → all client access denied.
--  Only the server's service_role key can read/write.)

-- 2) Constrain user roles at the DB level.
alter table users drop constraint if exists users_role_chk;
alter table users add constraint users_role_chk
  check (role in ('Admin', 'Cashier', 'Waiter'));

-- 3) Normalize existing emails to lowercase (login lowercases too).
update users set email = lower(email) where email <> lower(email);

-- 4) Refresh API schema cache.
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Zair Zabar POS — Superadmin (Owner) + block/suspend migration
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).
-- ============================================================

-- 1) Add the block flag used to suspend any account's login.
alter table users
  add column if not exists is_blocked boolean not null default false;

-- 1b) Widen the role CHECK constraint to allow "Superadmin".
--     (Old constraint only permitted Admin/Cashier/Waiter.)
alter table users drop constraint if exists users_role_chk;
alter table users
  add constraint users_role_chk
  check (role in ('Superadmin', 'Admin', 'Cashier', 'Waiter'));

-- 2) Promote the owner account to Superadmin.
--    The account must already exist (register/sign up first with this email),
--    then run this to grant owner authority.
update users
  set role = 'Superadmin', approved = true, email_verified = true, is_blocked = false
  where lower(email) = 'graphicslooks2002@gmail.com';

-- Verify:
-- select name, email, role, is_blocked from users where role = 'Superadmin';

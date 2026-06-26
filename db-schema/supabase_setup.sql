-- ============================================================
-- Zair Zabar POS — Supabase (Postgres) schema + seed
-- Run this whole file in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run: drops are guarded, seed is idempotent.
-- ============================================================

-- ---------- USERS ----------
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  phone       text not null,
  password    text not null,            -- bcrypt hash (hashed in Node, not Supabase Auth)
  role        text not null,            -- "Admin" | "Waiter" | "Cashier"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- TABLES ----------
create table if not exists tables (
  id               uuid primary key default gen_random_uuid(),
  table_no         integer not null unique,
  status           text not null default 'Available',  -- "Available" | "Booked"
  seats            integer not null,
  current_order_id uuid,                                -- FK added below (circular ref)
  created_at       timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  customer_details   jsonb not null,                    -- { name, phone, guests }
  order_status       text not null,                     -- "In Progress" | "Ready" | "Completed"
  order_date         timestamptz not null default now(),
  bills              jsonb not null,                    -- { total, tax, totalWithTax }
  items              jsonb not null default '[]'::jsonb,
  table_id           uuid references tables(id) on delete set null,
  payment_method     text,                              -- "Cash" | "Online"
  payment_data       jsonb,                             -- { razorpay_order_id, razorpay_payment_id }
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- circular FK: tables.current_order_id -> orders.id ----------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tables_current_order_fk'
  ) then
    alter table tables
      add constraint tables_current_order_fk
      foreign key (current_order_id) references orders(id) on delete set null;
  end if;
end $$;

-- ---------- PAYMENTS ----------
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  payment_id  text,
  order_id    text,
  amount      numeric,
  currency    text,
  status      text,
  method      text,
  email       text,
  contact     text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SEED: 10 tables (idempotent — re-running won't duplicate)
-- seats pattern: 1-4 -> 4 seats, 5-7 -> 6 seats, 8-10 -> 2 seats
-- ============================================================
insert into tables (table_no, seats) values
  (1, 4), (2, 4), (3, 4), (4, 4),
  (5, 6), (6, 6), (7, 6),
  (8, 2), (9, 2), (10, 2)
on conflict (table_no) do nothing;

-- ============================================================
-- RLS: left OFF. Express (service_role key, server-only) is the
-- only client. Do NOT expose service_role key to the frontend.
-- ============================================================
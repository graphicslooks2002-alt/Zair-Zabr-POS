-- ============================================================
-- Zair Zabar POS — Feature update migration
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent: add-column-if-not-exists, create-if-not-exists).
-- ============================================================

-- ---------- ORDERS: new columns ----------
alter table orders add column if not exists order_type      text;              -- 'Dine In' | 'Take Away'
alter table orders add column if not exists notes           text;              -- optional notes
alter table orders add column if not exists payment_status  text not null default 'Paid';  -- 'Paid' | 'Pending'
alter table orders add column if not exists discount_amount numeric not null default 0;    -- flat discount value applied (for reports)

-- order_status is legacy now (status workflow removed). Make it optional so inserts
-- without it succeed; existing rows keep their value.
alter table orders alter column order_status drop not null;

-- ---------- PENDING PAYMENTS ----------
create table if not exists pending_payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references orders(id) on delete cascade,
  customer_name   text,
  phone           text,
  items           jsonb not null default '[]'::jsonb,
  total_amount    numeric not null default 0,
  pending_amount  numeric not null default 0,
  order_date      timestamptz not null default now(),
  payment_status  text not null default 'Pending',   -- 'Pending' | 'Paid'
  remarks         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pending_payments_status_idx on pending_payments (payment_status);

-- ---------- SESSIONS (business day: open -> close, may cross midnight) ----------
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz,                       -- null while open
  status      text not null default 'open',      -- 'open' | 'closed'
  opened_by   uuid references users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Only one session may be open at a time (partial unique index).
create unique index if not exists sessions_single_open_idx
  on sessions ((status)) where status = 'open';

-- Optional: link each order to the session it belongs to (for fast session revenue).
alter table orders add column if not exists session_id uuid references sessions(id) on delete set null;
create index if not exists orders_session_idx on orders (session_id);

-- ============================================================
-- RLS stays OFF — Express service_role key is the only client.
-- ============================================================

-- Refresh PostgREST's schema cache so the new tables/columns are
-- immediately visible to the API (fixes "could not find table in schema cache").
NOTIFY pgrst, 'reload schema';

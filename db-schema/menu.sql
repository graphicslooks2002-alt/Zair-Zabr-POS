-- ============================================================
-- Zair Zabar POS — DB-backed menu (categories + products)
-- Run in Supabase Dashboard > SQL Editor. Idempotent.
-- ============================================================

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  icon        text,
  bg_color    text not null default '#e85d04',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id) on delete cascade,  -- a product MUST belong to a category
  name         text not null,
  price        numeric not null check (price >= 0),                        -- price can't be negative
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_idx on products (category_id);

-- RLS on; backend service_role bypasses it.
alter table categories enable row level security;
alter table products   enable row level security;

NOTIFY pgrst, 'reload schema';

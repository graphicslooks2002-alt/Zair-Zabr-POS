-- ============================================================
-- Zair Zabar POS — Analytics views (revenue reporting)
-- Run AFTER supabase_setup.sql (needs the orders table).
-- Run in: Supabase Dashboard > SQL Editor > New query
-- All views count ONLY completed orders as revenue.
-- ============================================================

-- ---------- DAILY ----------
create or replace view daily_revenue as
select
  date_trunc('day', order_date)::date          as period,
  count(*)                                       as orders,
  sum((bills->>'totalWithTax')::numeric)         as revenue,
  sum((bills->>'tax')::numeric)                  as tax,
  round(avg((bills->>'totalWithTax')::numeric), 2) as avg_order_value
from orders
where order_status = 'Completed'
group by 1
order by 1 desc;

-- ---------- WEEKLY ----------
create or replace view weekly_revenue as
select
  date_trunc('week', order_date)::date           as period,  -- Monday of that week
  count(*)                                        as orders,
  sum((bills->>'totalWithTax')::numeric)          as revenue,
  sum((bills->>'tax')::numeric)                   as tax,
  round(avg((bills->>'totalWithTax')::numeric), 2) as avg_order_value
from orders
where order_status = 'Completed'
group by 1
order by 1 desc;

-- ---------- MONTHLY ----------
create or replace view monthly_revenue as
select
  date_trunc('month', order_date)::date          as period,  -- 1st of month
  count(*)                                        as orders,
  sum((bills->>'totalWithTax')::numeric)          as revenue,
  sum((bills->>'tax')::numeric)                   as tax,
  round(avg((bills->>'totalWithTax')::numeric), 2) as avg_order_value
from orders
where order_status = 'Completed'
group by 1
order by 1 desc;

-- ---------- PAYMENT SPLIT (Cash vs Online) ----------
create or replace view payment_split as
select
  coalesce(payment_method, 'Unknown')            as method,
  count(*)                                        as orders,
  sum((bills->>'totalWithTax')::numeric)          as revenue
from orders
where order_status = 'Completed'
group by 1
order by revenue desc;

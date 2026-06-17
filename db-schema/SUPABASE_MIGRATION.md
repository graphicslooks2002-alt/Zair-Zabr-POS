# Supabase Migration Plan — Zair Zabar POS

**Path chosen:** A — keep Express, routes, Razorpay, and **custom JWT auth**. Swap the
data layer only: MongoDB + Mongoose → Supabase (Postgres) via `@supabase/supabase-js`.

**Goal:** preserve the exact JSON shape the frontend already consumes, so the React app
needs **little or no change**. Achieved with two tricks:
- `jsonb` columns for embedded objects (`customerDetails`, `bills`, `items`, `paymentData`)
  — Postgres preserves the exact camelCase keys.
- Supabase-js `select` **aliases** to rename top-level snake_case columns back to the
  camelCase / `_id` names the frontend expects.

---

## 1. Postgres schema

Run in Supabase SQL editor. UUIDs replace Mongo ObjectIds.

```sql
-- USERS
create table users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  phone       text not null,
  password    text not null,            -- bcrypt hash (we hash in Node, not Supabase Auth)
  role        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- TABLES
create table tables (
  id               uuid primary key default gen_random_uuid(),
  table_no         integer not null unique,
  status           text not null default 'Available',
  seats            integer not null,
  current_order_id uuid,                 -- FK added after orders exists (circular ref)
  created_at       timestamptz not null default now()
);

-- ORDERS
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  customer_details   jsonb not null,     -- { name, phone, guests }
  order_status       text not null,
  order_date         timestamptz not null default now(),
  bills              jsonb not null,     -- { total, tax, totalWithTax }
  items              jsonb not null default '[]'::jsonb,
  table_id           uuid references tables(id),
  payment_method     text,
  payment_data       jsonb,              -- { razorpay_order_id, razorpay_payment_id }
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- circular FK: tables.current_order_id -> orders.id
alter table tables
  add constraint tables_current_order_fk
  foreign key (current_order_id) references orders(id) on delete set null;

-- PAYMENTS
create table payments (
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
```

**Note:** since we keep custom JWT and the service_role key is server-only, Row Level
Security is optional. Leave RLS **off** (or add a permissive policy) — the Express layer
is the only thing talking to the DB. Do NOT expose the service_role key to the frontend.

---

## 2. Field mapping (Mongo → Postgres)

| Mongo (frontend sees) | Postgres column | Returned via select alias |
|---|---|---|
| `_id` | `id` | `_id:id` |
| `customerDetails` | `customer_details` (jsonb) | `customerDetails:customer_details` |
| `orderStatus` | `order_status` | `orderStatus:order_status` |
| `orderDate` | `order_date` | `orderDate:order_date` |
| `bills` | `bills` (jsonb) | `bills` |
| `items` | `items` (jsonb) | `items` |
| `table` (populated) | `table_id` → join `tables` | `table:tables(_id:id, tableNo:table_no)` |
| `paymentMethod` | `payment_method` | `paymentMethod:payment_method` |
| `paymentData` | `payment_data` (jsonb) | `paymentData:payment_data` |

---

## 3. Backend changes

### New files
- `config/supabase.js`
  ```js
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  module.exports = supabase;
  ```
- `.env` add: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### Delete / retire
- `config/database.js` (connectDB) and its call in `app.js`.
- `models/*.js` (all Mongoose models) — replaced by SQL + queries.
- `mongoose` dependency.

### Controllers — query replacements

**orderController.js**
- `getOrders`:
  ```js
  const { data, error } = await supabase
    .from("orders")
    .select("_id:id, customerDetails:customer_details, orderStatus:order_status, orderDate:order_date, bills, items, paymentMethod:payment_method, paymentData:payment_data, table:tables(_id:id, tableNo:table_no)")
    .order("created_at", { ascending: false });
  // res.json({ data })   // same shape as today
  ```
- `addOrder`: `supabase.from("orders").insert({ customer_details, order_status, bills, items, table_id, payment_method, payment_data }).select(<aliases>).single()`.
- `getOrderById`: `.select(<aliases>).eq("id", id).single()` — validate `id` is a uuid instead of `mongoose.isValidObjectId`.
- `updateOrder`: `.update({ order_status }).eq("id", id).select().single()`.

**tableController.js**
- `getTables`: `.select("_id:id, tableNo:table_no, status, seats, currentOrder:current_order_id(customerDetails:customer_details)")` (FK embed to orders for the customer name the UI shows).
- `addTable`: check existing via `.eq("table_no", tableNo)`, then insert.
- `updateTable`: `.update({ status, current_order_id: orderId }).eq("id", id)`.

**userController.js** (KEEP JWT)
- Move bcrypt hashing OUT of the model (no more pre-save hook) into `register`:
  ```js
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  await supabase.from("users").insert({ name, phone, email, password: hash, role });
  ```
- `login`: `supabase.from("users").select("*").eq("email", email).single()`, then
  `bcrypt.compare`, then sign JWT exactly as now (cookie unchanged).
- `getUserData`: `.select("id, name, email, phone, role").eq("id", req.user._id).single()`.

**tokenVerification.js**
- Replace `User.findById(decodeToken._id)` with
  `supabase.from("users").select("id, role").eq("id", decodeToken._id).single()`.
- Set `req.user = { _id: data.id, ...data }` so existing `req.user._id` keeps working.

**paymentController.js**
- If it logs payments to DB, swap the Mongoose `Payment.create` for
  `supabase.from("payments").insert({...})`. Razorpay SDK logic untouched.

---

## 4. Frontend changes

**None required** if select aliases above are used — responses keep `_id`,
`customerDetails`, `orderStatus`, `bills`, `items`, `table.tableNo`, etc.

Only watch-outs:
- IDs become UUID strings (were 24-char hex). `order._id.slice(-6)` still works.
- `axiosWrapper` base URL unchanged (still hits your Express server).

---

## 5. Migration steps (order of operations)

1. Create Supabase project → copy `SUPABASE_URL` + `service_role` key into backend `.env`.
2. Run the SQL in section 1.
3. `cd backend && npm i @supabase/supabase-js && npm uninstall mongoose`.
4. Add `config/supabase.js`; remove `connectDB()` from `app.js`.
5. Rewrite controllers + `tokenVerification.js` (section 3).
6. Seed the `tables` rows (10 tables) — insert via SQL or a one-off script.
7. (Optional) migrate existing Mongo data: export collections → transform `_id`→uuid,
   embedded docs→jsonb → insert. Or start fresh (local dev).
8. Test full flow: register/login → create order → book table → status → complete → free table.

---

## 6. Effort estimate

| Area | Effort |
|---|---|
| SQL schema + seed | small |
| `config/supabase.js` + env | trivial |
| 4 controllers rewrite | medium (the bulk of work) |
| token middleware | small |
| frontend | ~none (aliases preserve contract) |
| data migration (optional) | medium |

Risk is low and isolated to the backend data layer. Auth, routes, Razorpay, and the
entire React app stay as-is.
```

# Zair Zabar POS — Project Brief

A detailed technical overview of the Zair Zabar Point-of-Sale system: how it is
built, the technologies used, the backend functions, and the role-based access model.

> **Business context:** Zair Zabar is a restaurant in Haroonabad, Pakistan. The POS
> is used by staff to take orders, manage tables, settle payments (cash / online /
> credit), and by the owner/admins to view sales analytics. The business runs a
> single daily **session from 12:00 PM to 4:00 AM PKT** (it crosses midnight).

---

## 1. High-level architecture

```
┌─────────────────┐     HTTPS/JSON      ┌──────────────────┐    supabase-js    ┌──────────────┐
│   React (Vite)  │  ───────────────▶   │  Express (Node)  │  ──────────────▶  │  Supabase    │
│   Frontend SPA  │  ◀───────────────   │  REST API        │  ◀──────────────  │  (Postgres)  │
└─────────────────┘   cookies (JWT)     └──────────────────┘   service_role    └──────────────┘
        │                                        │                                     │
   Vercel (static)                        Vercel (serverless)                    Supabase cloud
```

- **Frontend** and **backend** are deployed separately on **Vercel**.
- The frontend talks only to the Express API (never directly to the database).
- Express is the **only** database client, using the Supabase **service_role** key
  (server-only — never exposed to the browser). Row-Level Security is therefore
  left off; Express is the trust boundary.
- Auth is a **custom JWT** in an httpOnly cookie (not Supabase Auth).

**Migration note:** the project originally used MongoDB + Mongoose and was migrated
to Supabase/Postgres (see `db-schema/SUPABASE_MIGRATION.md`). The old
`db-schema/schema.md` still says "MongoDB" and is **stale** — the live database is
Postgres.

---

## 2. Technology stack

### Frontend (`/frontend`)
| Concern | Technology |
|---|---|
| Framework | **React 18** |
| Build tool | **Vite 6** |
| Styling | **Tailwind CSS 3** (with CSS-variable theme tokens for light/dark) |
| Routing | **react-router-dom 7** |
| Server state / data fetching | **@tanstack/react-query 5** |
| Client state | **Redux Toolkit** (`user`, `cart`, `customer` slices) |
| HTTP client | **Axios** (`https/axiosWrapper.js`) |
| Charts | **Recharts** (Sales Trend line chart) |
| Notifications | **notistack** |
| Icons | **react-icons** |
| Animation | **framer-motion** |

### Backend (`/backend`)
| Concern | Technology |
|---|---|
| Runtime / framework | **Node.js + Express** |
| Database client | **@supabase/supabase-js** (service_role) |
| Auth | **jsonwebtoken** (custom JWT), **bcrypt** (password hashing, salt 10) |
| Email | **nodemailer** (Gmail SMTP) — verification / approval / password-reset |
| Payments | **Razorpay** SDK (online payments, optional) |
| Security | **express-rate-limit** (auth endpoints), CORS, cookie-parser |

### Database
- **Supabase (PostgreSQL)**.
- `jsonb` columns hold embedded objects (`customer_details`, `bills`, `items`,
  `payment_data`) so the frontend's camelCase shapes survive.
- Supabase-js `select` **aliases** rename snake_case columns back to the camelCase /
  `_id` names the frontend expects (e.g. `_id:id`, `customerDetails:customer_details`).

---

## 3. Database schema

SQL migrations live in `/db-schema` (run in the Supabase SQL Editor, in order):

1. `supabase_setup.sql` — base tables + seed (10 tables)
2. `auth_verification.sql` — `users.email_verified`, `users.approved`
3. `feature_updates.sql` — order columns, `pending_payments`, `sessions`
4. `menu.sql` — `categories`, `products`
5. `superadmin_migration.sql` — `users.is_blocked`, widen role check, promote owner
6. `analytics_views.sql` — revenue views
7. `security.sql` — RLS (note: its role CHECK omits `Superadmin`; run superadmin
   migration **after** it, or edit it to include Superadmin)

### Tables
| Table | Purpose | Key columns |
|---|---|---|
| `users` | Staff accounts | `name, email, phone, password (bcrypt), role, is_blocked, email_verified, approved` |
| `tables` | Dining tables | `table_no, status (Available/Booked), seats, current_order_id` |
| `orders` | **Every order (source of truth)** | `customer_details, order_type, bills, items, table_id, payment_method, payment_status, discount_amount, notes, session_id, order_date` |
| `pending_payments` | Credit/unpaid ledger | `order_id, customer_name, items, total_amount, pending_amount, payment_status` |
| `payments` | Online (Razorpay) records | `payment_id, order_id, amount, currency, status, method` |
| `categories` | Menu categories | `name, icon, bg_color, sort_order` |
| `products` | Menu items | `category_id, name, price, sort_order` |
| `sessions` | (Legacy/unused table — session logic is computed in code, not stored) | `opened_at, closed_at, status` |

### Views (computed, no stored rows)
`daily_revenue`, `weekly_revenue`, `monthly_revenue`, `payment_split` — all read
from `orders` and count **only** completed/paid orders as revenue.

---

## 4. Backend — routes, controllers & functions

All routes are mounted in `app.js` under `/api/*`. Every protected route runs
`isVerifiedUser` (validates the JWT cookie) and, where noted, `authorize(...roles)`.

### `/api/user` — authentication & staff management (`userController.js`)
| Method & path | Function | Access |
|---|---|---|
| POST `/register` | `register` | **Bootstrap** (first-ever user → auto-Admin) then **Admin/Superadmin only** |
| POST `/login` | `login` | Public (rate-limited) |
| POST `/forgot-password` | `forgotPassword` | Public |
| POST `/reset-password` | `resetPassword` | Public (token) |
| POST `/logout` | `logout` | Authenticated |
| GET `/verify` | `verifyEmail` | Email link (token) — confirms email, then emails the approver |
| GET `/approve` | `approveUser` | Email link (token) — approver activates the account |
| GET `/all` | `getAllUsers` | Admin/Superadmin |
| POST `/:id/resend-verify` | `resendVerification` | Admin/Superadmin |
| PUT `/:id/block` · `/:id/unblock` | `blockUser` / `unblockUser` | **Superadmin only** (can suspend any role) |
| PUT `/:id` | `updateUser` | Admin/Superadmin |
| DELETE `/:id` | `deleteUser` | Admin/Superadmin |
| GET `/` | `getUserData` | Authenticated (current user) |

### `/api/order` — orders (`orderController.js`)
| Method & path | Function | Access |
|---|---|---|
| POST `/` | `addOrder` — creates an order; if `Pending`, also inserts a `pending_payments` row | Any staff |
| GET `/` | `getOrders` — **pages through all rows** (bypasses PostgREST 1000-row cap) | Any staff |
| GET `/:id` | `getOrderById` | Any staff |
| PUT `/:id` | `updateOrder` — edit items/discount, recompute bill | Admin/Cashier/Superadmin |
| PUT `/:id/settle` | `settleOrder` — mark Paid, **delete** the pending row, free the table | Admin/Cashier/Superadmin |

### `/api/table` — tables (`tableController.js`)
| Method & path | Function | Access |
|---|---|---|
| POST `/` | `addTable` | Admin/Superadmin |
| GET `/` | `getTables` | Any staff |
| PUT `/:id` | `updateTable` — book/free during order flow | Any staff |
| PATCH `/:id/seats` | `updateTableSeats` | **Superadmin only** |

### `/api/pending` — credit payments (`pendingController.js`)
| Method & path | Function | Access |
|---|---|---|
| GET `/` | `getPendingPayments` (optional `?status=Pending|Paid`) | Any staff |
| PUT `/:id/settle` | `settlePending` — mark order Paid, free table, **delete** the ledger row | Admin/Cashier/Superadmin |

### `/api/menu` — menu (`menuController.js`)
| Method & path | Function | Access |
|---|---|---|
| GET `/` | `getMenu` (auto-seeds from frontend constants if empty) | Any staff |
| POST `/seed` | `seedMenu` | Admin/Superadmin |
| POST/PUT/DELETE `/category`, `/category/:id` | `addCategory` / `updateCategory` / `deleteCategory` | Admin/Superadmin |
| POST/PUT/DELETE `/product`, `/product/:id` | `addProduct` / `updateProduct` / `deleteProduct` | Admin/Superadmin |

### `/api/report` — analytics (`reportController.js`) — **Admin/Superadmin only** (router-level guard)
| Method & path | Function |
|---|---|
| GET `/daily` · `/weekly` · `/monthly` | read the revenue views |
| GET `/payment-split` | cash vs online split |
| GET `/summary?from&to` | roll up orders in a date range (revenue, paid/pending counts, cash/online, discounts) — **pages through all rows** |
| GET `/session` | summary for the current 12 PM–4 AM session |

### `/api/session` — `getCurrentSession` (any staff): returns the computed current session window.
### `/api/payment` — Razorpay: `createOrder`, `verifyPayment`, `webHookVerification` (webhook is public/signature-verified).

### Middleware
- `tokenVerification.isVerifiedUser` — reads the JWT cookie, loads the user, sets
  `req.user`; rejects blocked/unverified/unapproved.
- `authorize(...roles)` — RBAC gate.
- `adminOrBootstrap` — opens `/register` only when there are **zero** users
  (first-admin bootstrap); afterwards requires a logged-in Admin/Superadmin.
- `rateLimit.authLimiter` — throttles auth endpoints.

---

## 5. Authentication & account lifecycle

1. **Bootstrap:** the very first `/register` call creates an auto-active **Admin**.
2. **Staff creation:** afterwards, only an Admin/Superadmin can register staff.
3. **Email verification:** new staff receive a verification email
   (`sendVerifyEmail`). Clicking the link confirms their email.
4. **Approval:** on verification, an **approval email** is sent to
   `APPROVAL_EMAIL` (the owner). The approver clicks a link to activate the account.
5. **Login gate:** a user can log in only when `email_verified && approved && !is_blocked`.
6. **Password reset:** `forgot-password` → emailed reset link (30-min token) →
   `reset-password`.
7. **Session:** login issues a **JWT** stored in an httpOnly cookie; the frontend
   stays logged in via that cookie and a Redux `user` slice.

Passwords are **bcrypt-hashed** (salt 10) — never stored or recoverable in plaintext.

---

## 6. Role-based access control

Four roles, ranked by authority (`RANK` in `authorize.js`):

| Role | Rank | What they can do |
|---|---|---|
| **Superadmin** (Owner) | 4 | Everything. Exclusive: block/unblock any account (incl. Admins), edit table seats, mint other Superadmins. **Invisible** — Superadmin accounts never appear in the staff list, not even to the owner. |
| **Admin** | 3 | Full operational + management: dashboard/analytics, manage staff (create/verify/update/delete non-owner), manage menu & tables, orders, reports. |
| **Cashier** | 2 | Take orders, edit orders, settle payments. No dashboard/analytics, no staff/menu management. |
| **Waiter** | 1 | Take orders. Most limited. |

**Frontend gating** (`App.jsx`):
- `ProtectedRoutes` — any authenticated user (Orders, Tables, Menu, Create Order).
- `AdminRoute` — Admin/Superadmin only (Home dashboard `/`, `/dashboard`,
  `/dashboard/metric/:key`, `/dishes`). Non-admins are redirected to `/orders`.

**Backend gating** mirrors this via `authorize(...)` per route (see tables above).
Frontend gating is UX only; the backend is the real enforcement.

---

## 7. Frontend structure

```
frontend/src/
├── pages/            Home, Auth, Orders, CreateOrder, Tables, Menu,
│                     Dashboard, MetricDetail, AllDishes, ResetPassword
├── components/
│   ├── shared/       Header, BottomNav, Pagination, Modal, loaders
│   ├── dashboard/    Metrics, SalesChart, RecentOrders, PendingPayments,
│   │                 ManageStaff, MenuManagement, Add* modals
│   ├── orders/       OrderCard, EditOrderModal
│   ├── home/         Greetings, MiniCard, RecentOrders, OrderList, PopularDishes
│   ├── menu/         MenuContainer, CartInfo, CustomerInfo, Bill
│   ├── tables/       TableCard
│   ├── invoice/      Invoice (80mm thermal receipt + on-screen)
│   └── auth/         Login, Register, ForgotPassword
├── https/            index.js (API calls), axiosWrapper.js (axios instance)
├── redux/            store + slices (user, cart, customer)
├── hooks/            useLoadData, useTheme
└── utils/            formatting helpers (dates, avatar initials, paymentLabel)
```

- **Theming:** `index.css` defines CSS-variable tokens for dark (`:root`) and light
  (`:root.light`). `tailwind.config.js` maps semantic classes (`bg-base`,
  `bg-surface`, `text-main`, `text-muted`, `border-line`, `accent`, …) to those
  vars. `useTheme` toggles the `light` class on `<html>` and persists to
  localStorage; `index.html` applies the saved theme before first paint (no flash).
- **Navigation:** sticky `Header` (logo, theme toggle, dashboard/bell, user, logout)
  + fixed `BottomNav` (Home/Orders/Tables/More — Home/More are admin-only).

---

## 8. Key business logic

- **Business session (12 PM–4 AM PKT):** computed in code (`getCurrentSessionWindow`),
  **not** stored in the `sessions` table. Orders between 12 AM–4 AM PKT belong to the
  **previous** day's session (it crosses midnight).
- **PKT timezone:** all date/time logic anchors to **PKT (UTC+5)**. Custom date
  ranges append `+05:00` so a picked day covers the full Pakistan business day,
  including the late-night session.
- **Pending payments (credit):** an order placed as `Pending` inserts a
  `pending_payments` row. Settling it (from the Orders card or the Pending screen)
  marks the order `Paid`, frees the table, and **deletes** the ledger row (so the
  table holds only currently-outstanding credit).
- **Revenue / reports:** computed live from `orders` (paid orders = collected
  revenue). Both `getOrders` and the report fetch **page through all rows** to avoid
  PostgREST's 1000-row cap (which previously produced wrong wide-range totals).
- **Menu:** stored in `categories`/`products`; auto-seeds from the frontend
  constants (`constants/index.js`) on first load if the tables are empty.
- **Receipts:** `Invoice` renders an 80mm thermal-printer receipt (Urdu footer)
  and prints via a popup window.

---

## 9. Notable features (recent)

- **Light/Dark theme** with a header toggle (token-based, persisted, no-flash).
- **Sales Trend chart** (Recharts) on a dashboard **Sales** tab — Cash / Online /
  Pending lines by PKT day, 1 Week / 2 Weeks / 1 Month ranges, CVD-safe colors.
- **Session Sales Report (PDF)** — pick a month, download a PDF with **one row per
  session** (orders, cash, online, collected, discount, pending) + totals.
- **Performance/Dashboard reports** — styled printable PDF (summary + per-order
  details) for the selected period.
- **Stats cards** — Current Session / Yesterday / Weekly / Monthly / Custom ranges,
  each drillable to a per-order detail page with its own search + pagination.
- **All Dishes** page — per-item units sold **and revenue**, with a period filter
  and CSV download.
- **Table seat editing** (Superadmin) — inline `−/+` editor on each table card.
- **Pagination** on order tables/lists; **mobile-responsive** across all screens.

---

## 10. Configuration & deployment notes

**Backend environment variables** (`config/config.js`):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `EMAIL_USER`,
`EMAIL_PASS` (Gmail app password), `APPROVAL_EMAIL`, `SERVER_URL`, `FRONTEND_URL`,
and Razorpay keys.

**Frontend:** `VITE_BACKEND_URL` (falls back to the deployed backend).

**Watch-outs**
- **One database:** make sure the local `.env` `SUPABASE_URL` and the **Vercel**
  backend `SUPABASE_URL` point to the **same** Supabase project, or local and
  production will read/write different databases.
- **`APPROVAL_EMAIL`** must be set to the owner's inbox, or approval emails go to
  the default address.
- **`payments` table** is empty unless online/Razorpay payments are used (cash
  orders don't write there).
- **`sessions` table** is effectively unused (session windows are computed).
- Backend changes require a **Vercel redeploy** to take effect in production.

---

*Repository:* `github.com/graphicslooks2002-alt/Zair-Zabr-POS` ·
*Frontend:* Vercel · *Backend:* Vercel · *Database:* Supabase (Postgres)

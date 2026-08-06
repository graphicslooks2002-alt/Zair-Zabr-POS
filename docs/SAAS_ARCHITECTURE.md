# Zair Zabar POS → Multi-Tenant SaaS — Architecture Plan

**Goal:** Sell Zair Zabar POS as a product. You (the platform owner) create a client
from a portal; the client gets their **own POS at their own URL**
(`abc.yourpos.com`). You get a **fleet dashboard**: how many POS are live, how many
are billed, total sales this month, etc.

**Chosen model (this document):**
- **Isolation:** *database per client* (strongest isolation).
- **URL:** *subdomain per client* (`<client>.yourpos.com`).
- **Status:** plan only — no code yet.

> ⚠️ **Honest trade-off.** Database-per-client gives the best data isolation but is
> the **most expensive and operationally heavy** path, and it makes cross-client
> reporting (your fleet dashboard) *harder* because data lives in many separate
> databases. This plan addresses every one of those costs. If provisioning speed,
> cost, or the fleet dashboard turn out to matter more than hard isolation,
> **schema-per-tenant** (one DB, one schema per client) is the lighter middle
> ground — noted in §9 as the fallback.

---

## 1. The two planes

A SaaS like this splits into two independent systems:

### Control plane (the platform — yours)
A **central service + database** that knows about *clients*, not their POS data.
Holds:
- `organizations` — client id, name, **subdomain/slug**, status (active/suspended), plan, created_at.
- `tenant_databases` — for each org, **where its database lives** (Supabase project ref / connection string / keys), region, schema version.
- `platform_users` — you and your staff (Platform Owner role).
- `subscriptions` / `invoices` — billing (Stripe), plan, MRR, status.
- `fleet_metrics` — rolled-up per-tenant numbers for the dashboard (see §6).

This plane powers the **vendor portal** (create client, suspend, see the fleet).

### Tenant plane (each client's POS)
Each client = **its own database**, containing exactly today's Zair Zabar schema
(`users, tables, orders, pending_payments, categories, products, sessions,
payments`, views). No `organization_id` columns needed — the *database itself* is
the tenant boundary.

The **same POS codebase** serves every tenant; it just connects to a **different
database per request**, chosen by subdomain.

---

## 2. What "database per client" means on Supabase

Supabase = one Postgres per **project**. Two ways to realize DB-per-client:

| Approach | Isolation | Provisioning | Cost | Fit |
|---|---|---|---|---|
| **A. Project-per-client** (each client = its own Supabase project) | Hard (separate DB, keys, region) | Slow — create project via **Supabase Management API**, wait for it to boot, run migrations | **High** — each project bills separately | True DB-per-client |
| **B. Schema-per-client** (one project, one Postgres **schema** per client) | Good (schema + RLS) | Fast — `create schema`, run migrations into it | Low — one project | Practical "isolated DB" |

**Recommendation for the chosen model:** start with **B (schema-per-client)** — it
delivers per-client isolation and independent data, provisions in seconds, and
keeps one bill — then graduate specific clients to **A (project-per-client)** if a
client demands physical isolation. Both fit this plan; the control plane's
`tenant_databases` row just records *which* it is and how to connect.

---

## 3. Provisioning flow (create a new client "ABC")

From the vendor portal you fill: business name, subdomain (`abc`), owner email, plan. Then the platform:

1. **Validate** subdomain is free (unique in `organizations`).
2. **Create the tenant database** — schema `abc` (approach B) or a new Supabase
   project (approach A).
3. **Run migrations** — apply the Zair Zabar schema (all tables + views) to it.
4. **Seed** — 10 tables, default menu, etc.
5. **Create the client's owner** — first Superadmin user inside the tenant DB
   (hashed temp password / invite email).
6. **Record it** — insert `organizations` + `tenant_databases` rows; map subdomain → tenant DB.
7. **Register DNS/TLS** for `abc.yourpos.com` (wildcard cert covers it — §5).
8. **Return the URL + credentials** to you to hand to the client.

All automated; a client is live in minutes with no new deployment.

---

## 4. Request routing (how the POS picks the right database)

Single POS deployment, dynamic tenant connection:

```
Browser: abc.yourpos.com
   │  (subdomain = abc)
   ▼
Frontend SPA  ──── API call with Host: abc.yourpos.com ────▶  Express backend
                                                               │
                                        1. read subdomain "abc" from Host
                                        2. look up tenant DB in CONTROL PLANE
                                           (cache it) → connection info
                                        3. get/create a Supabase client for THAT db
                                        4. run the request against the tenant db
```

- A **tenant-resolver middleware** runs before everything: subdomain → `req.tenantDb`.
- A **connection cache/pool** keeps one Supabase client per tenant (don't recreate per request).
- The control-plane lookup is cached (e.g. in memory / Redis) so it isn't hit every call.
- If subdomain unknown or org suspended → block with a clear error page.

This replaces today's single hard-wired `config/supabase.js` with a **per-tenant
client factory** driven by the control plane.

---

## 5. Subdomains (DNS + TLS)

- Buy a domain, e.g. `yourpos.com`.
- **Wildcard DNS:** `*.yourpos.com` → your frontend host (Vercel supports wildcard
  domains); `api.yourpos.com` → backend.
- **Wildcard TLS cert** (`*.yourpos.com`) so every client subdomain is HTTPS with no
  per-client cert work.
- Frontend reads `window.location.host` → subdomain → sends it (Host header / an
  `X-Tenant` header) so the backend knows the tenant.
- Reserved subdomains: `app`, `api`, `admin` (the vendor portal), `www`.

---

## 6. The fleet dashboard — the hard part of DB-per-client

Your explicit want: *"how many POS working, how many billed, how much sold this
month."* With data spread across many databases, you **cannot** just run one query.
Three ways, best last:

1. **Fan-out query (live):** the control plane loops over every tenant DB and
   aggregates. Simple, but slow and fragile as clients grow — don't rely on it for
   the main dashboard.
2. **Tenant push (event):** each POS, on key events, posts a summary to the control
   plane (like the n8n webhook idea). Near-real-time but more moving parts.
3. **Nightly (or hourly) rollup (recommended):** a scheduled job visits each tenant
   DB, computes its numbers (orders, sales, active status), and writes them into the
   control plane's **`fleet_metrics`** table. The dashboard then reads **one** fast
   table. Billing status comes from `subscriptions`. This is how you get "sold this
   month across all clients" cheaply.

Combine: nightly rollup for history + a "refresh now" fan-out for a single client on demand.

---

## 7. Auth across the two planes

- **Platform Owner (you):** authenticates against the **control plane**; only they
  can open the vendor portal, create/suspend clients, see the fleet. A brand-new top
  role above tenant Superadmins.
- **Tenant users (client staff):** authenticate against **their own tenant DB**
  (today's JWT flow, unchanged) — resolved by subdomain. A client's Superadmin has
  no visibility into other clients or the platform.
- Keep the two token audiences separate so a tenant token can never act on the
  control plane.

---

## 8. Migrations across many databases

With N tenant databases, a schema change must apply to **all** of them.
- Keep **versioned migrations** (numbered SQL files) — you already have the
  `db-schema/*.sql` set; formalize them into an ordered, versioned migration folder.
- A **migration runner** in the control plane iterates every `tenant_databases`
  row, applies pending migrations, and records the new `schema_version`.
- New clients are provisioned at the latest version automatically.
- This is real ops overhead — the price of DB-per-client. Budget for it.

---

## 9. Fallback if DB-per-client proves too heavy

If provisioning cost, migration fan-out, or the fleet dashboard become painful, the
lighter model is **shared DB + `organization_id` on every row** (single database,
tenant filter + Postgres RLS). Same subdomain routing and vendor portal; the only
change is the isolation mechanism. The control plane and portal you build here carry
over — so this plan is not wasted if you switch. (Schema-per-client in §2-B is the
natural in-between and the recommended starting point.)

---

## 10. Billing (control plane)

- **Stripe** (or Paddle) — a customer + subscription per organization.
- `subscriptions`: plan, status (`active` / `past_due` / `canceled`), current period,
  MRR. Webhooks keep it in sync.
- Portal shows: how many orgs **billed** (active subscriptions), **MRR**, churn,
  past-due. Suspend a tenant automatically when a subscription lapses (control plane
  flips `organizations.status` → routing blocks their POS with a "billing" page).

---

## 11. Phased roadmap (when you green-light building)

| Phase | Deliverable |
|---|---|
| **0 · Control plane** | Central DB + service: `organizations`, `tenant_databases`, `platform_users`. Platform Owner auth. |
| **1 · Per-tenant connection** | Refactor backend `config/supabase.js` → tenant-client factory; subdomain resolver middleware; connection cache. Migrate current Zair Zabar into tenant #1. |
| **2 · Provisioning** | "Create client" in the portal → provisions schema/project, runs migrations, seeds, creates owner, maps subdomain, returns URL. |
| **3 · Subdomain routing** | Wildcard DNS + TLS; frontend tenant detection; suspended/unknown-tenant pages. |
| **4 · Fleet dashboard** | Nightly rollup job → `fleet_metrics`; portal dashboard: active POS, orders/sales this month, billed count. |
| **5 · Billing** | Stripe subscriptions, plans, MRR, past-due → auto-suspend. |
| **6 · Migration tooling** | Versioned migrations + runner across all tenant DBs. |

Each phase is shippable and de-risks the next. Phase 0–1 is the foundation; nothing
client-facing changes for the existing Zair Zabar until Phase 2+.

---

## 12. Biggest risks / costs (eyes open)

- **Ops overhead of N databases** — migrations, backups, monitoring per tenant.
- **Provisioning latency/cost** — project-per-client (approach A) is slow + pricey;
  schema-per-client (B) mitigates this.
- **Fleet reporting complexity** — solved by the rollup (§6), but it's real work.
- **Connection management** — pooling per tenant; avoid exhausting DB connections.
- **Cross-plane security** — a tenant must never reach the control plane or another
  tenant's DB. The resolver + separate auth audiences are load-bearing.
- **This is a multi-month build**, not a feature. Phase it; keep today's POS running
  as tenant #1 throughout.

---

*Status: architecture plan only. No code changes made. Next step when ready:
Phase 0 (control plane) — say the word and we scope it in detail.*

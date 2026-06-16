# Hygiene BMS — Business Management System

A production-ready management system for a **sanitary pad & hygiene products wholesale-retail** shop. Built with Next.js 15 (App Router), TypeScript, TailwindCSS, ShadCN UI, and Supabase (Postgres + Auth + Storage + Realtime + RLS).

> **GST note:** In India, sanitary napkins are **GST-exempt (0%)** since July 2018, while other hygiene products (wipes, washes, tampons, diapers) attract GST. Each product carries a configurable `gst_rate` (default `0`), so the GST module and tax invoices stay correct across your mixed catalog.

---

## Features

| Module | Highlights |
| --- | --- |
| **Dashboard** | Today's sales/expenses, net profit, outstanding; sales-trend, monthly-revenue, expense-breakdown & top-products charts; reorder alerts; recent activity. Role-aware (staff see a limited view). |
| **Inventory** | Product CRUD, **quantity-based price tiers** (e.g. 20+ → Price B, 1000+ → Price C), stock-in/out, batch & expiry tracking, low-stock alerts, type filter, debounced search, **Supabase Realtime** live updates. |
| **Sales** | Billing cart with **price auto-selected by quantity tier**, discounts, stock-availability guard, atomic checkout, GST tax-invoice, **PDF download** (React-PDF) stored in Supabase Storage, invoice history. |
| **Purchases** | Supplier directory, multi-line bulk purchase entry with per-product cost, **multiple named purchasing charges** (transport, loading, GST…), automatic stock-in + cost-price update. |
| **Customers** | CRUD, ledger with running balance, outstanding tracking, payment collection & history. |
| **Expenses** | Category-wise daily entry, monthly summary. |
| **Reports** | Daily P&L, Monthly business report, GST summary, Top products, Customer outstanding, Inventory valuation — all with date-range filters + print. |
| **Settings** | Business profile, GST config, invoice prefix, user management & roles (owner only). |

### Roles
- **Owner** — full access.
- **Staff** — Dashboard (limited), Inventory, Sales, Customers. No access to Purchases, Expenses, Reports, or Settings.

Authorization is enforced **at the database level with RLS** and mirrored in the UI for navigation gating.

---

## Tech Stack
- **Frontend:** Next.js 15 App Router, TypeScript, TailwindCSS, ShadCN UI, React Hook Form, Zod, Recharts
- **Backend:** Supabase — Postgres, Auth (email/password, JWT), Storage, Realtime, Row Level Security
- **PDF:** `@react-pdf/renderer`
- **Money:** stored everywhere as integer **paise** to avoid float rounding

---

## Project Structure

```
supabase/
  config.toml
  migrations/
    20250101000000_schema.sql          # tables, enums, indexes, timestamp + stock triggers
    20250101000001_views.sql           # current_stock / outstanding / P&L / top_products / gst_summary
    20250101000002_functions.sql       # create_sale, create_purchase, dashboard_summary, role helpers
    20250101000003_rls.sql             # Row Level Security policies (owner/staff)
    20250101000004_storage_realtime.sql# invoices bucket + realtime publication
  seed.sql                             # sample products, customers, sales, expenses…
src/
  app/
    (app)/                             # authenticated shell (Sidebar + Header)
      dashboard | inventory | sales | purchases | customers | expenses | reports | settings
    api/  dashboard | invoices/[id]    # JSON summary + invoice PDF
    login/                             # auth pages + server actions
  components/                          # Sidebar, Header, DataTable, charts, forms, invoice…
    ui/                                # ShadCN primitives
  hooks/                               # useAuth, useInventory, useSales, use-toast, use-debounce
  lib/                                 # supabase clients, auth, permissions, calculations, validations, format, invoice
  types/                               # database, product, sales, customer
  middleware.ts                        # session refresh + route guard
```

---

## Local Setup

### Prerequisites
- Node.js 18.18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`)
- Docker (for local Supabase)

### 1. Install
```bash
npm install
cp .env.example .env.local
```

### 2. Start Supabase locally
```bash
supabase start          # spins up Postgres, Auth, Storage, Studio
supabase db reset       # runs all migrations + seed.sql
```
Copy the printed **API URL** and **anon/service_role keys** into `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000 and **sign up** — the **first account automatically becomes the Owner**. Create staff accounts later from **Settings → Users**.

---

## Deploying to Production (Supabase + Vercel)

### A. Supabase (backend)
1. Create a project at [supabase.com](https://supabase.com).
2. Link & push migrations:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push          # applies everything in supabase/migrations
   ```
   (Seed data is for local dev; skip in production, or run selected inserts manually.)
3. **Auth → Providers:** keep Email enabled. For a closed shop tool, you may turn **off public sign-ups** after creating the owner, and create users from Settings.
4. **Auth → URL Configuration:** set Site URL to your Vercel domain and add it to redirect URLs.
5. Storage buckets `invoices` (private) and `branding` (public) are created by the migration.
6. From **Settings → API** copy the Project URL, `anon` key, and `service_role` key.

### B. Vercel (frontend)
1. Push this repo to GitHub and **Import** it in Vercel.
2. Add Environment Variables (Production + Preview):
   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service-role key (server-only) |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
3. Deploy. Vercel auto-detects Next.js (build `next build`).
4. Visit the site and sign up to create the Owner account.

> The invoice PDF route runs on the Node.js runtime (`@react-pdf/renderer`), which Vercel handles automatically. No extra config needed.

---

## Business Logic Reference
- **Net Profit** = Total Sales − COGS − Expenses
- **Gross Margin %** = ((Selling − Cost) / Selling) × 100
- **COGS** = Σ(sale_item.quantity × product.cost_price)
- **Stock balance** = stock_in − stock_out  (`stock_entries` is the single source of truth)
- **Customer outstanding** = credit_sales − customer_payments
- **Reorder alert** = current_stock ≤ reorder_point
- **GST** (per line, MRP-inclusive): gst = total × rate / (100 + rate); CGST = SGST = gst / 2

All implemented in SQL views/RPCs and mirrored in `src/lib/calculations.ts`.

---

## Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:reset` | Reset local DB + reseed |
| `npm run db:push` | Push migrations to linked project |

---

## Security Notes
- RLS is enabled on **every** table; staff can never read expenses/purchases/financials.
- The `service_role` key is used only in trusted server code (`src/lib/supabase/admin.ts`) for admin user creation — never shipped to the browser.
- All mutations re-validate input with Zod on the server in addition to client-side validation.

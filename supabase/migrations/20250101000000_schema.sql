-- =============================================================================
-- 20250101000000_schema.sql
-- Core schema: extensions, enums, tables, indexes, timestamp + stock triggers.
-- All monetary values are stored as integer paise (1 INR = 100 paise) to avoid
-- floating-point rounding errors.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "moddatetime" schema extensions; -- updated_at trigger

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type user_role        as enum ('owner', 'staff');
create type stock_movement   as enum ('in', 'out');
create type customer_type    as enum ('retail', 'wholesale');
create type payment_mode     as enum ('cash', 'upi', 'credit');
create type expense_category as enum ('rent', 'salary', 'transport', 'utility', 'marketing', 'misc');

-- -----------------------------------------------------------------------------
-- users  (mirrors auth.users with app profile + role)
-- -----------------------------------------------------------------------------
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  email      text not null unique,
  role       user_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  brand                text,
  size                 text,
  type                 text,
  unit                 text not null default 'piece',
  selling_price_paise  bigint  not null default 0 check (selling_price_paise   >= 0),
  wholesale_price_paise bigint not null default 0 check (wholesale_price_paise  >= 0),
  cost_price_paise     bigint  not null default 0 check (cost_price_paise       >= 0),
  reorder_point        integer not null default 0 check (reorder_point          >= 0),
  gst_rate             numeric(5,2) not null default 0 check (gst_rate >= 0 and gst_rate <= 100),
  hsn_code             text,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- stock_entries  (single source of truth for on-hand stock)
-- -----------------------------------------------------------------------------
create table public.stock_entries (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete restrict,
  type        stock_movement not null,
  quantity    integer not null check (quantity > 0),
  batch_no    text,
  expiry_date date,
  note        text,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  address    text,
  gstin      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- purchases / purchase_items
-- -----------------------------------------------------------------------------
create table public.purchases (
  id                  uuid primary key default gen_random_uuid(),
  supplier_id         uuid references public.suppliers (id) on delete set null,
  invoice_no          text,
  total_amount_paise  bigint not null default 0 check (total_amount_paise >= 0),
  transport_cost_paise bigint not null default 0 check (transport_cost_paise >= 0),
  created_by          uuid references public.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

create table public.purchase_items (
  id              uuid primary key default gen_random_uuid(),
  purchase_id     uuid not null references public.purchases (id) on delete cascade,
  product_id      uuid not null references public.products (id) on delete restrict,
  quantity        integer not null check (quantity > 0),
  unit_cost_paise bigint  not null default 0 check (unit_cost_paise >= 0),
  batch_no        text,
  expiry_date     date
);

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  address       text,
  customer_type customer_type not null default 'retail',
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- sales / sale_items
-- -----------------------------------------------------------------------------
create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.customers (id) on delete set null,
  user_id        uuid references public.users (id) on delete set null,
  invoice_no     text not null unique,
  subtotal_paise bigint not null default 0 check (subtotal_paise >= 0),
  discount_paise bigint not null default 0 check (discount_paise >= 0),
  total_paise    bigint not null default 0 check (total_paise >= 0),
  payment_mode   payment_mode not null default 'cash',
  created_at     timestamptz not null default now()
);

create table public.sale_items (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references public.sales (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete restrict,
  quantity         integer not null check (quantity > 0),
  unit_price_paise bigint  not null default 0 check (unit_price_paise >= 0),
  total_paise      bigint  not null default 0 check (total_paise >= 0)
);

-- -----------------------------------------------------------------------------
-- expenses
-- -----------------------------------------------------------------------------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  category     expense_category not null default 'misc',
  amount_paise bigint not null check (amount_paise >= 0),
  note         text,
  date         date not null default current_date,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- customer_payments  (collections against credit sales)
-- -----------------------------------------------------------------------------
create table public.customer_payments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  note         text,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- business_settings  (singleton row — owner editable)
-- -----------------------------------------------------------------------------
create table public.business_settings (
  id              boolean primary key default true check (id),
  business_name   text not null default 'Hygiene Mart',
  address         text,
  phone           text,
  email           text,
  gstin           text,
  state           text default 'Gujarat',
  state_code      text default '24',
  invoice_prefix  text not null default 'INV',
  default_gst_rate numeric(5,2) not null default 0,
  logo_url        text,
  updated_at      timestamptz not null default now()
);
insert into public.business_settings (id) values (true) on conflict do nothing;

-- =============================================================================
-- Indexes
-- =============================================================================
create index idx_products_active        on public.products (name)        where deleted_at is null;
create index idx_products_type          on public.products (type)        where deleted_at is null;
create index idx_stock_entries_product  on public.stock_entries (product_id);
create index idx_stock_entries_created  on public.stock_entries (created_at desc);
create index idx_stock_entries_expiry   on public.stock_entries (expiry_date) where expiry_date is not null;
create index idx_purchase_items_purchase on public.purchase_items (purchase_id);
create index idx_purchase_items_product  on public.purchase_items (product_id);
create index idx_purchases_supplier      on public.purchases (supplier_id);
create index idx_purchases_created       on public.purchases (created_at desc);
create index idx_customers_active        on public.customers (name) where deleted_at is null;
create index idx_sales_customer          on public.sales (customer_id);
create index idx_sales_user              on public.sales (user_id);
create index idx_sales_created           on public.sales (created_at desc);
create index idx_sales_payment_mode      on public.sales (payment_mode);
create index idx_sale_items_sale         on public.sale_items (sale_id);
create index idx_sale_items_product      on public.sale_items (product_id);
create index idx_expenses_date           on public.expenses (date desc);
create index idx_expenses_category       on public.expenses (category);
create index idx_customer_payments_cust  on public.customer_payments (customer_id);
create index idx_customer_payments_created on public.customer_payments (created_at desc);

-- =============================================================================
-- updated_at triggers (requirement: "Triggers for timestamps")
-- =============================================================================
create trigger set_users_updated_at      before update on public.users
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger set_products_updated_at    before update on public.products
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger set_suppliers_updated_at   before update on public.suppliers
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger set_customers_updated_at   before update on public.customers
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger set_settings_updated_at    before update on public.business_settings
  for each row execute procedure extensions.moddatetime (updated_at);

-- =============================================================================
-- Auto-create public.users profile when a Supabase auth user is created.
-- The first user to ever sign up becomes the 'owner'; everyone else is 'staff'.
-- =============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role user_role;
begin
  if (select count(*) from public.users) = 0 then
    assigned_role := 'owner';
  else
    assigned_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'staff');
  end if;

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- =============================================================================
-- Stock auto-sync: purchase_items -> stock 'in', sale_items -> stock 'out'.
-- Keeps stock_entries as the single source of truth without app-layer writes.
-- =============================================================================
create or replace function public.purchase_item_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pinvoice text;
  pcreator uuid;
begin
  select invoice_no, created_by into pinvoice, pcreator
  from public.purchases where id = new.purchase_id;

  insert into public.stock_entries (product_id, type, quantity, batch_no, expiry_date, note, created_by)
  values (new.product_id, 'in', new.quantity, new.batch_no, new.expiry_date,
          'Purchase ' || coalesce(pinvoice, new.purchase_id::text), pcreator);
  return new;
end;
$$;

create trigger trg_purchase_item_stock
  after insert on public.purchase_items
  for each row execute procedure public.purchase_item_to_stock();

create or replace function public.sale_item_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sinvoice text;
  screator uuid;
begin
  select invoice_no, user_id into sinvoice, screator
  from public.sales where id = new.sale_id;

  insert into public.stock_entries (product_id, type, quantity, note, created_by)
  values (new.product_id, 'out', new.quantity,
          'Sale ' || coalesce(sinvoice, new.sale_id::text), screator);
  return new;
end;
$$;

create trigger trg_sale_item_stock
  after insert on public.sale_items
  for each row execute procedure public.sale_item_to_stock();

-- Invoice number sequence for sales
create sequence if not exists public.sales_invoice_seq start with 1;

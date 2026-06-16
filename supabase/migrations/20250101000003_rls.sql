-- =============================================================================
-- 20250101000003_rls.sql
-- Row Level Security. Authorization model:
--   owner -> full access to everything
--   staff -> Dashboard (read), Inventory (read/write), Sales (read/write),
--            Customers (read/write).  NO access to expenses, purchases,
--            suppliers, financial settings, or user management.
-- Helper functions current_user_role() / is_owner() are defined in the
-- functions migration (SECURITY DEFINER, so they don't recurse through RLS).
-- =============================================================================

alter table public.users             enable row level security;
alter table public.products          enable row level security;
alter table public.stock_entries     enable row level security;
alter table public.suppliers         enable row level security;
alter table public.purchases         enable row level security;
alter table public.purchase_items    enable row level security;
alter table public.customers         enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.expenses          enable row level security;
alter table public.customer_payments enable row level security;
alter table public.business_settings enable row level security;

-- ----------------------------------------------------------------------------
-- users : a user can read their own row; owners read/manage all rows.
-- ----------------------------------------------------------------------------
create policy users_select_self_or_owner on public.users
  for select using (id = auth.uid() or public.is_owner());
create policy users_owner_insert on public.users
  for insert with check (public.is_owner());
create policy users_owner_update on public.users
  for update using (public.is_owner()) with check (public.is_owner());
create policy users_owner_delete on public.users
  for delete using (public.is_owner());

-- ----------------------------------------------------------------------------
-- products : all authenticated staff/owner read + write; only owner can delete.
-- ----------------------------------------------------------------------------
create policy products_select on public.products
  for select using (auth.uid() is not null);
create policy products_insert on public.products
  for insert with check (auth.uid() is not null);
create policy products_update on public.products
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy products_delete on public.products
  for delete using (public.is_owner());

-- ----------------------------------------------------------------------------
-- stock_entries : staff + owner read/insert (inventory module).
-- ----------------------------------------------------------------------------
create policy stock_select on public.stock_entries
  for select using (auth.uid() is not null);
create policy stock_insert on public.stock_entries
  for insert with check (auth.uid() is not null);
create policy stock_owner_modify on public.stock_entries
  for delete using (public.is_owner());

-- ----------------------------------------------------------------------------
-- customers : staff + owner read/write; only owner can delete.
-- ----------------------------------------------------------------------------
create policy customers_select on public.customers
  for select using (auth.uid() is not null);
create policy customers_insert on public.customers
  for insert with check (auth.uid() is not null);
create policy customers_update on public.customers
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy customers_delete on public.customers
  for delete using (public.is_owner());

-- ----------------------------------------------------------------------------
-- sales / sale_items : staff + owner read/write.
-- ----------------------------------------------------------------------------
create policy sales_select on public.sales
  for select using (auth.uid() is not null);
create policy sales_insert on public.sales
  for insert with check (auth.uid() is not null);
create policy sales_owner_update on public.sales
  for update using (public.is_owner());
create policy sales_owner_delete on public.sales
  for delete using (public.is_owner());

create policy sale_items_select on public.sale_items
  for select using (auth.uid() is not null);
create policy sale_items_insert on public.sale_items
  for insert with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- customer_payments : staff + owner (collections happen at the counter).
-- ----------------------------------------------------------------------------
create policy payments_select on public.customer_payments
  for select using (auth.uid() is not null);
create policy payments_insert on public.customer_payments
  for insert with check (auth.uid() is not null);
create policy payments_owner_delete on public.customer_payments
  for delete using (public.is_owner());

-- ----------------------------------------------------------------------------
-- OWNER-ONLY tables: suppliers, purchases, purchase_items, expenses, settings.
-- ----------------------------------------------------------------------------
create policy suppliers_owner_all on public.suppliers
  for all using (public.is_owner()) with check (public.is_owner());

create policy purchases_owner_all on public.purchases
  for all using (public.is_owner()) with check (public.is_owner());

create policy purchase_items_owner_all on public.purchase_items
  for all using (public.is_owner()) with check (public.is_owner());

create policy expenses_owner_all on public.expenses
  for all using (public.is_owner()) with check (public.is_owner());

create policy settings_owner_select on public.business_settings
  for select using (auth.uid() is not null);   -- everyone may read business profile (for invoices)
create policy settings_owner_update on public.business_settings
  for update using (public.is_owner()) with check (public.is_owner());

-- ----------------------------------------------------------------------------
-- Grants: RPCs are executable by authenticated users; they enforce their own
-- checks internally. create_purchase is owner-gated by the purchases policies
-- because it is SECURITY DEFINER but writes owner-only tables under the owner's
-- definer rights — so we additionally guard it in the app layer + below.
-- ----------------------------------------------------------------------------
revoke all on function public.create_purchase(uuid, text, bigint, jsonb) from public, anon;
grant execute on function public.create_purchase(uuid, text, bigint, jsonb) to authenticated;
grant execute on function public.create_sale(uuid, payment_mode, bigint, jsonb) to authenticated;
grant execute on function public.dashboard_summary() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- Belt-and-suspenders: create_purchase must only run for owners.
create or replace function public.assert_owner()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can perform this action';
  end if;
end;
$$;

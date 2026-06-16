-- =============================================================================
-- 20250101000007_barcode_and_setup.sql
-- 1) Product barcode (for scan / quick-add billing).
-- 2) has_any_user(): anon-callable check used by the first-run setup screen.
-- =============================================================================

-- ---- Barcode ---------------------------------------------------------------
alter table public.products add column if not exists barcode text;
create index if not exists idx_products_barcode
  on public.products (barcode) where barcode is not null and deleted_at is null;

-- Recreate current_stock_view with barcode appended (same column order as before
-- + barcode at the end, so `create or replace view` is allowed).
create or replace view public.current_stock_view
with (security_invoker = true) as
select
  p.id                                                  as product_id,
  p.name,
  p.brand,
  p.size,
  p.type,
  p.unit,
  p.reorder_point,
  p.cost_price_paise,
  p.selling_price_paise,
  p.wholesale_price_paise,
  coalesce(sum(case when s.type = 'in'  then s.quantity end), 0)  as stock_in,
  coalesce(sum(case when s.type = 'out' then s.quantity end), 0)  as stock_out,
  coalesce(sum(case when s.type = 'in'  then s.quantity end), 0)
    - coalesce(sum(case when s.type = 'out' then s.quantity end), 0) as current_stock,
  (coalesce(sum(case when s.type = 'in'  then s.quantity end), 0)
    - coalesce(sum(case when s.type = 'out' then s.quantity end), 0)) <= p.reorder_point as is_low_stock,
  (coalesce(sum(case when s.type = 'in'  then s.quantity end), 0)
    - coalesce(sum(case when s.type = 'out' then s.quantity end), 0)) * p.cost_price_paise as stock_value_paise,
  p.barcode
from public.products p
left join public.stock_entries s on s.product_id = p.id
where p.deleted_at is null
group by p.id;

-- ---- First-run check -------------------------------------------------------
-- Returns true once at least one app user exists. Anon may call it so the
-- /setup screen can decide whether to allow creating the first owner.
create or replace function public.has_any_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users);
$$;

grant execute on function public.has_any_user() to anon, authenticated;

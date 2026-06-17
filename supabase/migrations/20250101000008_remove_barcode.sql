-- =============================================================================
-- 20250101000008_remove_barcode.sql
-- Reverts the product barcode feature: drops products.barcode and restores
-- current_stock_view to its original (no-barcode) shape.
-- (has_any_user() from migration 7 is kept — it powers the first-run setup.)
-- =============================================================================

-- The view references products.barcode, so drop it before dropping the column.
drop view if exists public.current_stock_view;

alter table public.products drop column if exists barcode;

create view public.current_stock_view
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
    - coalesce(sum(case when s.type = 'out' then s.quantity end), 0)) * p.cost_price_paise as stock_value_paise
from public.products p
left join public.stock_entries s on s.product_id = p.id
where p.deleted_at is null
group by p.id;

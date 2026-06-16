-- =============================================================================
-- 20250101000001_views.sql
-- Reporting views. These run with the privileges of the querying user, so RLS
-- on the underlying tables still applies (security_invoker).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- current_stock_view : on-hand stock = stock_in - stock_out, with reorder flag.
-- -----------------------------------------------------------------------------
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
    - coalesce(sum(case when s.type = 'out' then s.quantity end), 0)) * p.cost_price_paise as stock_value_paise
from public.products p
left join public.stock_entries s on s.product_id = p.id
where p.deleted_at is null
group by p.id;

-- -----------------------------------------------------------------------------
-- customer_outstanding_view : credit_sales - customer_payments.
-- -----------------------------------------------------------------------------
create or replace view public.customer_outstanding_view
with (security_invoker = true) as
select
  c.id   as customer_id,
  c.name,
  c.phone,
  c.customer_type,
  coalesce(cs.credit_sales_paise, 0)                                as credit_sales_paise,
  coalesce(cp.payments_paise, 0)                                    as payments_paise,
  coalesce(cs.credit_sales_paise, 0) - coalesce(cp.payments_paise, 0) as outstanding_paise
from public.customers c
left join (
  select customer_id, sum(total_paise) as credit_sales_paise
  from public.sales
  where payment_mode = 'credit' and customer_id is not null
  group by customer_id
) cs on cs.customer_id = c.id
left join (
  select customer_id, sum(amount_paise) as payments_paise
  from public.customer_payments
  group by customer_id
) cp on cp.customer_id = c.id
where c.deleted_at is null;

-- -----------------------------------------------------------------------------
-- profit_loss_view : per-day Sales, COGS, Expenses, Net Profit.
--   Net Profit = Total Sales - COGS - Expenses
-- -----------------------------------------------------------------------------
create or replace view public.profit_loss_view
with (security_invoker = true) as
with sales_day as (
  select
    (s.created_at at time zone 'Asia/Kolkata')::date as day,
    sum(s.total_paise)    as total_sales_paise,
    sum(s.discount_paise) as discount_paise
  from public.sales s
  group by 1
),
cogs_day as (
  select
    (s.created_at at time zone 'Asia/Kolkata')::date as day,
    sum(si.quantity * p.cost_price_paise) as cogs_paise
  from public.sales s
  join public.sale_items si on si.sale_id = s.id
  join public.products p    on p.id = si.product_id
  group by 1
),
exp_day as (
  select date as day, sum(amount_paise) as expenses_paise
  from public.expenses
  group by 1
)
select
  d.day,
  coalesce(sd.total_sales_paise, 0)                                     as total_sales_paise,
  coalesce(sd.discount_paise, 0)                                        as discount_paise,
  coalesce(cd.cogs_paise, 0)                                            as cogs_paise,
  coalesce(sd.total_sales_paise, 0) - coalesce(cd.cogs_paise, 0)        as gross_profit_paise,
  coalesce(ed.expenses_paise, 0)                                        as expenses_paise,
  coalesce(sd.total_sales_paise, 0)
    - coalesce(cd.cogs_paise, 0)
    - coalesce(ed.expenses_paise, 0)                                    as net_profit_paise
from (
  select day from sales_day
  union select day from cogs_day
  union select day from exp_day
) d
left join sales_day sd on sd.day = d.day
left join cogs_day  cd on cd.day = d.day
left join exp_day   ed on ed.day = d.day;

-- -----------------------------------------------------------------------------
-- top_products_view : units sold, revenue, COGS, profit per product (all-time).
--   Filter by date range in the application by querying sale_items directly,
--   or use this for the all-time leaderboard.
-- -----------------------------------------------------------------------------
create or replace view public.top_products_view
with (security_invoker = true) as
select
  p.id                                       as product_id,
  p.name,
  p.brand,
  p.type,
  coalesce(sum(si.quantity), 0)              as qty_sold,
  coalesce(sum(si.total_paise), 0)           as revenue_paise,
  coalesce(sum(si.quantity * p.cost_price_paise), 0) as cogs_paise,
  coalesce(sum(si.total_paise), 0)
    - coalesce(sum(si.quantity * p.cost_price_paise), 0) as profit_paise
from public.products p
left join public.sale_items si on si.product_id = p.id
group by p.id;

-- -----------------------------------------------------------------------------
-- gst_summary_view : GST grouped by rate and day. Sale prices are treated as
-- GST-INCLUSIVE (Indian retail MRP convention); tax is back-calculated.
--   gst_amount = total * rate / (100 + rate)
--   taxable    = total - gst_amount
-- CGST/SGST are split 50/50 for intra-state supply.
-- -----------------------------------------------------------------------------
create or replace view public.gst_summary_view
with (security_invoker = true) as
select
  (s.created_at at time zone 'Asia/Kolkata')::date as day,
  p.gst_rate,
  count(distinct s.id)                              as invoice_count,
  sum(si.total_paise)                               as gross_paise,
  round(sum(si.total_paise * p.gst_rate / (100 + p.gst_rate)))            as gst_paise,
  sum(si.total_paise) - round(sum(si.total_paise * p.gst_rate / (100 + p.gst_rate))) as taxable_paise,
  round(sum(si.total_paise * p.gst_rate / (100 + p.gst_rate)) / 2)        as cgst_paise,
  round(sum(si.total_paise * p.gst_rate / (100 + p.gst_rate)) / 2)        as sgst_paise
from public.sales s
join public.sale_items si on si.sale_id = s.id
join public.products p    on p.id = si.product_id
group by 1, 2;

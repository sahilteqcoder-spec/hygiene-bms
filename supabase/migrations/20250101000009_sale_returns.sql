-- =============================================================================
-- 20250101000009_sale_returns.sql
-- Sales returns/refunds: restore stock, record the return, and reflect it in
-- customer outstanding + the P&L (net of returns).
-- =============================================================================

create table public.sale_returns (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  total_paise bigint not null default 0 check (total_paise >= 0),
  note        text,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.sale_return_items (
  id               uuid primary key default gen_random_uuid(),
  return_id        uuid not null references public.sale_returns (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete restrict,
  quantity         integer not null check (quantity > 0),
  unit_price_paise bigint  not null default 0 check (unit_price_paise >= 0),
  total_paise      bigint  not null default 0 check (total_paise >= 0)
);

create index idx_sale_returns_sale     on public.sale_returns (sale_id);
create index idx_sale_returns_customer on public.sale_returns (customer_id);
create index idx_sale_returns_created  on public.sale_returns (created_at desc);
create index idx_return_items_return   on public.sale_return_items (return_id);
create index idx_return_items_product  on public.sale_return_items (product_id);

alter table public.sale_returns      enable row level security;
alter table public.sale_return_items enable row level security;

-- Staff + owner can process returns at the counter; only owner can delete.
create policy returns_select on public.sale_returns
  for select using (auth.uid() is not null);
create policy returns_insert on public.sale_returns
  for insert with check (auth.uid() is not null);
create policy returns_owner_delete on public.sale_returns
  for delete using (public.is_owner());

create policy return_items_select on public.sale_return_items
  for select using (auth.uid() is not null);
create policy return_items_insert on public.sale_return_items
  for insert with check (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- create_return : validates quantities, records the return, restores stock.
-- p_items: jsonb array of { product_id, quantity, unit_price_paise }
-- -----------------------------------------------------------------------------
create or replace function public.create_return(
  p_sale_id uuid,
  p_items   jsonb,
  p_note    text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_customer  uuid;
  v_invoice   text;
  v_return_id uuid;
  v_total     bigint := 0;
  item        jsonb;
  v_pid       uuid;
  v_qty       integer;
  v_price     bigint;
  v_sold      integer;
  v_returned  integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item to return';
  end if;

  select customer_id, invoice_no into v_customer, v_invoice from public.sales where id = p_sale_id;
  if v_invoice is null then raise exception 'Sale not found'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_pid   := (item ->> 'product_id')::uuid;
    v_qty   := (item ->> 'quantity')::integer;
    v_price := (item ->> 'unit_price_paise')::bigint;
    if v_qty <= 0 then continue; end if;

    select coalesce(sum(quantity), 0) into v_sold
    from public.sale_items where sale_id = p_sale_id and product_id = v_pid;

    select coalesce(sum(sri.quantity), 0) into v_returned
    from public.sale_return_items sri
    join public.sale_returns sr on sr.id = sri.return_id
    where sr.sale_id = p_sale_id and sri.product_id = v_pid;

    if v_qty > (v_sold - v_returned) then
      raise exception 'Cannot return more than sold (% remaining)', (v_sold - v_returned);
    end if;

    v_total := v_total + (v_qty * v_price);
  end loop;

  if v_total = 0 then raise exception 'Nothing to return'; end if;

  insert into public.sale_returns (sale_id, customer_id, total_paise, note, created_by)
  values (p_sale_id, v_customer, v_total, p_note, v_uid)
  returning id into v_return_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_pid   := (item ->> 'product_id')::uuid;
    v_qty   := (item ->> 'quantity')::integer;
    v_price := (item ->> 'unit_price_paise')::bigint;
    if v_qty <= 0 then continue; end if;

    insert into public.sale_return_items (return_id, product_id, quantity, unit_price_paise, total_paise)
    values (v_return_id, v_pid, v_qty, v_price, v_qty * v_price);

    -- Restore stock.
    insert into public.stock_entries (product_id, type, quantity, note, created_by)
    values (v_pid, 'in', v_qty, 'Return on sale ' || v_invoice, v_uid);
  end loop;

  return v_return_id;
end;
$$;

grant execute on function public.create_return(uuid, jsonb, text) to authenticated;

-- -----------------------------------------------------------------------------
-- View updates: subtract returns from outstanding (credit sales) and the P&L.
-- (Same columns as before, so create or replace is valid.)
-- -----------------------------------------------------------------------------
create or replace view public.customer_outstanding_view
with (security_invoker = true) as
select
  c.id   as customer_id,
  c.name,
  c.phone,
  c.customer_type,
  coalesce(cs.credit_sales_paise, 0)                                  as credit_sales_paise,
  coalesce(cp.payments_paise, 0)                                      as payments_paise,
  coalesce(cs.credit_sales_paise, 0)
    - coalesce(cp.payments_paise, 0)
    - coalesce(cr.credit_returns_paise, 0)                            as outstanding_paise
from public.customers c
left join (
  select customer_id, sum(total_paise) as credit_sales_paise
  from public.sales where payment_mode = 'credit' and customer_id is not null
  group by customer_id
) cs on cs.customer_id = c.id
left join (
  select customer_id, sum(amount_paise) as payments_paise
  from public.customer_payments group by customer_id
) cp on cp.customer_id = c.id
left join (
  select sr.customer_id, sum(sr.total_paise) as credit_returns_paise
  from public.sale_returns sr
  join public.sales s on s.id = sr.sale_id
  where s.payment_mode = 'credit' and sr.customer_id is not null
  group by sr.customer_id
) cr on cr.customer_id = c.id
where c.deleted_at is null;

create or replace view public.profit_loss_view
with (security_invoker = true) as
with sales_day as (
  select (s.created_at at time zone 'Asia/Kolkata')::date as day,
         sum(s.total_paise) as total_sales_paise, sum(s.discount_paise) as discount_paise
  from public.sales s group by 1
),
cogs_day as (
  select (s.created_at at time zone 'Asia/Kolkata')::date as day,
         sum(si.quantity * p.cost_price_paise) as cogs_paise
  from public.sales s
  join public.sale_items si on si.sale_id = s.id
  join public.products p on p.id = si.product_id
  group by 1
),
ret_day as (
  select (sr.created_at at time zone 'Asia/Kolkata')::date as day,
         sum(sr.total_paise) as returns_paise
  from public.sale_returns sr group by 1
),
ret_cogs_day as (
  select (sr.created_at at time zone 'Asia/Kolkata')::date as day,
         sum(sri.quantity * p.cost_price_paise) as return_cogs_paise
  from public.sale_returns sr
  join public.sale_return_items sri on sri.return_id = sr.id
  join public.products p on p.id = sri.product_id
  group by 1
),
exp_day as (
  select date as day, sum(amount_paise) as expenses_paise from public.expenses group by 1
)
select
  d.day,
  coalesce(sd.total_sales_paise, 0) - coalesce(rd.returns_paise, 0)              as total_sales_paise,
  coalesce(sd.discount_paise, 0)                                                 as discount_paise,
  coalesce(cd.cogs_paise, 0) - coalesce(rcd.return_cogs_paise, 0)                as cogs_paise,
  (coalesce(sd.total_sales_paise, 0) - coalesce(rd.returns_paise, 0))
    - (coalesce(cd.cogs_paise, 0) - coalesce(rcd.return_cogs_paise, 0))          as gross_profit_paise,
  coalesce(ed.expenses_paise, 0)                                                 as expenses_paise,
  (coalesce(sd.total_sales_paise, 0) - coalesce(rd.returns_paise, 0))
    - (coalesce(cd.cogs_paise, 0) - coalesce(rcd.return_cogs_paise, 0))
    - coalesce(ed.expenses_paise, 0)                                             as net_profit_paise
from (
  select day from sales_day union select day from cogs_day
  union select day from ret_day union select day from exp_day
) d
left join sales_day sd on sd.day = d.day
left join cogs_day  cd on cd.day = d.day
left join ret_day   rd on rd.day = d.day
left join ret_cogs_day rcd on rcd.day = d.day
left join exp_day   ed on ed.day = d.day;

-- =============================================================================
-- 20250101000002_functions.sql
-- Transactional business RPCs. SECURITY DEFINER so the whole operation is
-- atomic and consistent; each function asserts the caller is authenticated.
-- =============================================================================

-- Role of the current auth user (used by RLS policies; defined here so policies
-- in the next migration can reference it).
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'owner', false);
$$;

-- -----------------------------------------------------------------------------
-- create_sale : validates stock, generates invoice no, inserts sale + items.
-- p_items: jsonb array of { product_id, quantity, unit_price_paise }
-- Returns the created sale row id and invoice_no.
-- -----------------------------------------------------------------------------
create or replace function public.create_sale(
  p_customer_id   uuid,
  p_payment_mode  payment_mode,
  p_discount_paise bigint,
  p_items         jsonb
)
returns table (sale_id uuid, invoice_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_prefix    text;
  v_seq       bigint;
  v_invoice   text;
  v_subtotal  bigint := 0;
  v_total     bigint;
  v_sale_id   uuid;
  item        jsonb;
  v_pid       uuid;
  v_qty       integer;
  v_price     bigint;
  v_avail     bigint;
  v_pname     text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must contain at least one item';
  end if;

  -- Validate each line and accumulate subtotal.
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_pid   := (item ->> 'product_id')::uuid;
    v_qty   := (item ->> 'quantity')::integer;
    v_price := (item ->> 'unit_price_paise')::bigint;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be greater than 0';
    end if;

    select current_stock, name into v_avail, v_pname
    from public.current_stock_view where product_id = v_pid;

    if v_avail is null then
      raise exception 'Product % not found', v_pid;
    end if;
    if v_avail < v_qty then
      raise exception 'Insufficient stock for "%": % available, % requested', v_pname, v_avail, v_qty;
    end if;

    v_subtotal := v_subtotal + (v_qty * v_price);
  end loop;

  v_total := v_subtotal - coalesce(p_discount_paise, 0);
  if v_total < 0 then
    raise exception 'Discount cannot exceed subtotal';
  end if;

  select invoice_prefix into v_prefix from public.business_settings where id;
  v_seq := nextval('public.sales_invoice_seq');
  v_invoice := coalesce(v_prefix, 'INV') || '-' || lpad(v_seq::text, 6, '0');

  insert into public.sales (customer_id, user_id, invoice_no, subtotal_paise, discount_paise, total_paise, payment_mode)
  values (p_customer_id, v_uid, v_invoice, v_subtotal, coalesce(p_discount_paise, 0), v_total, p_payment_mode)
  returning id into v_sale_id;

  -- Insert items (the trg_sale_item_stock trigger writes the 'out' stock entries).
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_pid   := (item ->> 'product_id')::uuid;
    v_qty   := (item ->> 'quantity')::integer;
    v_price := (item ->> 'unit_price_paise')::bigint;
    insert into public.sale_items (sale_id, product_id, quantity, unit_price_paise, total_paise)
    values (v_sale_id, v_pid, v_qty, v_price, v_qty * v_price);
  end loop;

  return query select v_sale_id, v_invoice;
end;
$$;

-- -----------------------------------------------------------------------------
-- create_purchase : inserts purchase + items, updates latest cost price.
-- p_items: jsonb array of { product_id, quantity, unit_cost_paise, batch_no, expiry_date }
-- -----------------------------------------------------------------------------
create or replace function public.create_purchase(
  p_supplier_id          uuid,
  p_invoice_no           text,
  p_transport_cost_paise bigint,
  p_items                jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_total      bigint := 0;
  v_purchase_id uuid;
  item         jsonb;
  v_pid        uuid;
  v_qty        integer;
  v_cost       bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_owner() then
    raise exception 'Only the owner can record purchases';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A purchase must contain at least one item';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_qty  := (item ->> 'quantity')::integer;
    v_cost := (item ->> 'unit_cost_paise')::bigint;
    v_total := v_total + (v_qty * v_cost);
  end loop;
  v_total := v_total + coalesce(p_transport_cost_paise, 0);

  insert into public.purchases (supplier_id, invoice_no, total_amount_paise, transport_cost_paise, created_by)
  values (p_supplier_id, p_invoice_no, v_total, coalesce(p_transport_cost_paise, 0), v_uid)
  returning id into v_purchase_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_pid  := (item ->> 'product_id')::uuid;
    v_qty  := (item ->> 'quantity')::integer;
    v_cost := (item ->> 'unit_cost_paise')::bigint;

    insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost_paise, batch_no, expiry_date)
    values (
      v_purchase_id, v_pid, v_qty, v_cost,
      nullif(item ->> 'batch_no', ''),
      nullif(item ->> 'expiry_date', '')::date
    );

    -- Keep product cost price aligned with most recent purchase cost.
    update public.products set cost_price_paise = v_cost where id = v_pid;
  end loop;

  return v_purchase_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- dashboard_summary : headline cards for the dashboard (today, Asia/Kolkata).
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_sales bigint;
  v_expenses bigint;
  v_cogs bigint;
  v_outstanding bigint;
begin
  select coalesce(sum(total_paise), 0) into v_sales
  from public.sales
  where (created_at at time zone 'Asia/Kolkata')::date = v_today;

  select coalesce(sum(si.quantity * p.cost_price_paise), 0) into v_cogs
  from public.sales s
  join public.sale_items si on si.sale_id = s.id
  join public.products p on p.id = si.product_id
  where (s.created_at at time zone 'Asia/Kolkata')::date = v_today;

  select coalesce(sum(amount_paise), 0) into v_expenses
  from public.expenses where date = v_today;

  select coalesce(sum(outstanding_paise), 0) into v_outstanding
  from public.customer_outstanding_view where outstanding_paise > 0;

  return jsonb_build_object(
    'today_sales_paise',     v_sales,
    'today_expenses_paise',  v_expenses,
    'today_cogs_paise',      v_cogs,
    'today_net_profit_paise', v_sales - v_cogs - v_expenses,
    'outstanding_paise',     v_outstanding
  );
end;
$$;

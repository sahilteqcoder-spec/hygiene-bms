-- =============================================================================
-- 20250101000005_pricing_and_charges.sql
-- 1) Quantity-based price tiers per product (replaces the retail/wholesale split
--    as the pricing driver). products.selling_price_paise stays as the BASE
--    price (used when quantity is below the smallest tier).
-- 2) Multiple named charges per purchase (transport, loading, GST, ...).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- product_price_tiers : (min_quantity -> price). When selling quantity Q, the
-- app picks the tier with the largest min_quantity <= Q; if none, it uses the
-- product's base selling_price_paise.
-- ----------------------------------------------------------------------------
create table public.product_price_tiers (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  min_quantity integer not null check (min_quantity >= 1),
  price_paise  bigint  not null check (price_paise >= 0),
  created_at   timestamptz not null default now(),
  unique (product_id, min_quantity)
);
create index idx_price_tiers_product on public.product_price_tiers (product_id, min_quantity);

alter table public.product_price_tiers enable row level security;

-- Tiers follow the same access as products: any authenticated staff/owner may
-- read and manage them (product editing lives in the staff-accessible Inventory).
create policy price_tiers_select on public.product_price_tiers
  for select using (auth.uid() is not null);
create policy price_tiers_insert on public.product_price_tiers
  for insert with check (auth.uid() is not null);
create policy price_tiers_update on public.product_price_tiers
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy price_tiers_delete on public.product_price_tiers
  for delete using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- purchase_charges : itemised expenses incurred during a purchase.
-- ----------------------------------------------------------------------------
create table public.purchase_charges (
  id           uuid primary key default gen_random_uuid(),
  purchase_id  uuid not null references public.purchases (id) on delete cascade,
  label        text not null default 'Charge',
  amount_paise bigint not null check (amount_paise >= 0),
  created_at   timestamptz not null default now()
);
create index idx_purchase_charges_purchase on public.purchase_charges (purchase_id);

alter table public.purchase_charges enable row level security;
create policy purchase_charges_owner_all on public.purchase_charges
  for all using (public.is_owner()) with check (public.is_owner());

-- ----------------------------------------------------------------------------
-- Revised create_purchase: accepts p_charges (jsonb array of {label, amount_paise})
-- instead of a single transport amount. transport_cost_paise now stores the SUM
-- of all charges (kept for backward-compatible reporting/display).
-- ----------------------------------------------------------------------------
drop function if exists public.create_purchase(uuid, text, bigint, jsonb);

create or replace function public.create_purchase(
  p_supplier_id uuid,
  p_invoice_no  text,
  p_charges     jsonb,
  p_items       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_total        bigint := 0;
  v_charges_total bigint := 0;
  v_purchase_id  uuid;
  item           jsonb;
  charge         jsonb;
  v_pid          uuid;
  v_qty          integer;
  v_cost         bigint;
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

  if p_charges is not null then
    for charge in select * from jsonb_array_elements(p_charges)
    loop
      v_charges_total := v_charges_total + coalesce((charge ->> 'amount_paise')::bigint, 0);
    end loop;
  end if;
  v_total := v_total + v_charges_total;

  insert into public.purchases (supplier_id, invoice_no, total_amount_paise, transport_cost_paise, created_by)
  values (p_supplier_id, p_invoice_no, v_total, v_charges_total, v_uid)
  returning id into v_purchase_id;

  if p_charges is not null then
    for charge in select * from jsonb_array_elements(p_charges)
    loop
      insert into public.purchase_charges (purchase_id, label, amount_paise)
      values (
        v_purchase_id,
        coalesce(nullif(charge ->> 'label', ''), 'Charge'),
        coalesce((charge ->> 'amount_paise')::bigint, 0)
      );
    end loop;
  end if;

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

    update public.products set cost_price_paise = v_cost where id = v_pid;
  end loop;

  return v_purchase_id;
end;
$$;

revoke all on function public.create_purchase(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.create_purchase(uuid, text, jsonb, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- Helper: resolve the effective unit price for a product at a given quantity.
-- (Used by the app; also handy for ad-hoc SQL / future server-side validation.)
-- ----------------------------------------------------------------------------
create or replace function public.product_price_at_qty(p_product_id uuid, p_quantity integer)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select t.price_paise
      from public.product_price_tiers t
      where t.product_id = p_product_id
        and t.min_quantity <= greatest(p_quantity, 1)
      order by t.min_quantity desc
      limit 1
    ),
    (select selling_price_paise from public.products where id = p_product_id)
  );
$$;
grant execute on function public.product_price_at_qty(uuid, integer) to authenticated;

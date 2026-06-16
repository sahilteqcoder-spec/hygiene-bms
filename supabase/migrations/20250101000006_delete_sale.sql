-- =============================================================================
-- 20250101000006_delete_sale.sql
-- Owner-only deletion of a sale that also REVERSES the stock it consumed
-- (inserts compensating 'in' entries), so inventory stays correct. Atomic.
-- =============================================================================

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice text;
  item      record;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can delete a sale';
  end if;

  select invoice_no into v_invoice from public.sales where id = p_sale_id;
  if v_invoice is null then
    raise exception 'Sale not found';
  end if;

  -- Put the sold quantities back into stock with an auditable reversal entry.
  for item in select product_id, quantity from public.sale_items where sale_id = p_sale_id
  loop
    insert into public.stock_entries (product_id, type, quantity, note, created_by)
    values (item.product_id, 'in', item.quantity,
            'Reversal of deleted sale ' || v_invoice, auth.uid());
  end loop;

  delete from public.sales where id = p_sale_id;  -- cascades sale_items
end;
$$;

revoke all on function public.delete_sale(uuid) from public, anon;
grant execute on function public.delete_sale(uuid) to authenticated;

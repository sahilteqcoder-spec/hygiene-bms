-- =============================================================================
-- 20250101000010_upi_and_purchase_delete.sql
-- 1) UPI id on business settings (for the scan-to-pay QR on invoices).
-- 2) delete_purchase(): owner-only, reverses the stock it added, then removes it.
-- =============================================================================

alter table public.business_settings add column if not exists upi_id text;

create or replace function public.delete_purchase(p_purchase_id uuid)
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
    raise exception 'Only the owner can delete a purchase';
  end if;

  select invoice_no into v_invoice from public.purchases where id = p_purchase_id;
  if not found then raise exception 'Purchase not found'; end if;

  -- Remove the stock this purchase had added (compensating 'out' entries).
  for item in select product_id, quantity from public.purchase_items where purchase_id = p_purchase_id
  loop
    insert into public.stock_entries (product_id, type, quantity, note, created_by)
    values (item.product_id, 'out', item.quantity,
            'Reversal of deleted purchase ' || coalesce(v_invoice, p_purchase_id::text), auth.uid());
  end loop;

  delete from public.purchases where id = p_purchase_id;  -- cascades items + charges
end;
$$;

revoke all on function public.delete_purchase(uuid) from public, anon;
grant execute on function public.delete_purchase(uuid) to authenticated;

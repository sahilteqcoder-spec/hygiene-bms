-- =============================================================================
-- 20250101000004_storage_realtime.sql
-- Storage bucket for invoice PDFs + Realtime publication for live stock.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Storage: private 'invoices' bucket. PDFs are served via signed URLs.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy "invoices_read_authenticated"
  on storage.objects for select
  using (bucket_id = 'invoices' and auth.uid() is not null);

create policy "invoices_insert_authenticated"
  on storage.objects for insert
  with check (bucket_id = 'invoices' and auth.uid() is not null);

create policy "invoices_update_authenticated"
  on storage.objects for update
  using (bucket_id = 'invoices' and auth.uid() is not null);

-- Optional logo bucket (public) for the business profile.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "branding_public_read"
  on storage.objects for select
  using (bucket_id = 'branding');

create policy "branding_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'branding' and public.is_owner());

-- ----------------------------------------------------------------------------
-- Realtime: broadcast inserts/updates so the Inventory UI updates live.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.stock_entries;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.sales;

-- Ensure UPDATE/DELETE payloads include the full old row for diffing.
alter table public.stock_entries replica identity full;
alter table public.products      replica identity full;

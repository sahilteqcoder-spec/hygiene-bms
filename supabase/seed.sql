-- =============================================================================
-- seed.sql  — sample data for local development (`supabase db reset`).
--
-- NOTE: Auth users are NOT seeded here (creating auth.users via raw SQL is
-- brittle across Supabase versions). Create your owner by signing up in the
-- app — the first signup automatically becomes the 'owner' (see
-- handle_new_auth_user trigger). All business rows below use NULL for
-- created_by/user_id, which is allowed.
-- =============================================================================

update public.business_settings set
  business_name = 'Shakti Hygiene Mart',
  address       = 'Shop 14, Ring Road Market, Surat, Gujarat 395002',
  phone         = '+91 98250 12345',
  email         = 'sales@shaktihygiene.example',
  gstin         = '24ABCDE1234F1Z5',
  state         = 'Gujarat',
  state_code    = '24',
  invoice_prefix = 'SHM',
  default_gst_rate = 0
where id;

do $$
declare
  -- products
  p_whisper   uuid; p_stayfree  uuid; p_sofy     uuid; p_carefree uuid;
  p_pads_xl   uuid; p_tampon    uuid; p_cup      uuid; p_liner    uuid;
  p_wash      uuid; p_diaper    uuid; p_adult    uuid; p_tissue   uuid;
  -- suppliers
  s_pg uuid; s_jnj uuid;
  -- customers
  c_retail uuid; c_whole uuid; c_clinic uuid;
  -- sales
  sale1 uuid; sale2 uuid; sale3 uuid;
begin
  -- ---- Products -----------------------------------------------------------
  insert into public.products (name, brand, size, type, unit, selling_price_paise, wholesale_price_paise, cost_price_paise, reorder_point, gst_rate, hsn_code)
  values
    ('Whisper Ultra Clean', 'Whisper', 'XL', 'Sanitary Pad', 'pack', 4500, 3800, 3200, 20, 0, '9619'),
    ('Stayfree Secure', 'Stayfree', 'L', 'Sanitary Pad', 'pack', 4000, 3400, 2900, 20, 0, '9619'),
    ('Sofy Bodyfit', 'Sofy', 'L', 'Sanitary Pad', 'pack', 4200, 3500, 3000, 15, 0, '9619'),
    ('Carefree Daily', 'Carefree', 'M', 'Sanitary Pad', 'pack', 3000, 2500, 2100, 15, 0, '9619'),
    ('Whisper Maxi XL+', 'Whisper', 'XL+', 'Sanitary Pad', 'pack', 5500, 4700, 4000, 25, 0, '9619'),
    ('Sofy Tampons', 'Sofy', 'Regular', 'Tampon', 'box', 9000, 7800, 7000, 10, 12, '9619'),
    ('Sirona Menstrual Cup', 'Sirona', 'Medium', 'Menstrual Cup', 'piece', 39900, 34000, 30000, 8, 12, '9619'),
    ('Whisper Pantyliner', 'Whisper', 'Slim', 'Panty Liner', 'pack', 2500, 2100, 1800, 20, 0, '9619'),
    ('Intimate Wash 100ml', 'Everteen', '100ml', 'Intimate Wash', 'bottle', 18500, 16000, 14000, 12, 18, '3401'),
    ('Baby Diaper Pants', 'MamyPoko', 'L', 'Diaper', 'pack', 39900, 36000, 33000, 10, 12, '9619'),
    ('Adult Diaper', 'Friends', 'L', 'Adult Diaper', 'pack', 55000, 49000, 45000, 6, 12, '9619'),
    ('Wet Wipes 80s', 'Pampers', 'Standard', 'Wet Wipes', 'pack', 19900, 17000, 15000, 12, 18, '3401');

  select id into p_whisper from public.products where name = 'Whisper Ultra Clean';
  select id into p_stayfree from public.products where name = 'Stayfree Secure';
  select id into p_sofy     from public.products where name = 'Sofy Bodyfit';
  select id into p_carefree from public.products where name = 'Carefree Daily';
  select id into p_pads_xl  from public.products where name = 'Whisper Maxi XL+';
  select id into p_tampon   from public.products where name = 'Sofy Tampons';
  select id into p_cup      from public.products where name = 'Sirona Menstrual Cup';
  select id into p_liner    from public.products where name = 'Whisper Pantyliner';
  select id into p_wash     from public.products where name = 'Intimate Wash 100ml';
  select id into p_diaper   from public.products where name = 'Baby Diaper Pants';
  select id into p_adult    from public.products where name = 'Adult Diaper';
  select id into p_tissue   from public.products where name = 'Wet Wipes 80s';

  -- ---- Opening stock (stock 'in') ----------------------------------------
  insert into public.stock_entries (product_id, type, quantity, batch_no, expiry_date, note) values
    (p_whisper,  'in', 120, 'WH-2406', '2027-06-01', 'Opening stock'),
    (p_stayfree, 'in', 100, 'SF-2405', '2027-05-01', 'Opening stock'),
    (p_sofy,     'in',  80, 'SO-2406', '2027-06-01', 'Opening stock'),
    (p_carefree, 'in',  60, 'CF-2404', '2027-04-01', 'Opening stock'),
    (p_pads_xl,  'in',  90, 'WX-2406', '2027-06-01', 'Opening stock'),
    (p_tampon,   'in',  40, 'TP-2403', '2026-09-01', 'Opening stock'),
    (p_cup,      'in',  25, 'CUP-2401','2030-01-01', 'Opening stock'),
    (p_liner,    'in',  70, 'PL-2405', '2027-05-01', 'Opening stock'),
    (p_wash,     'in',  45, 'IW-2406', '2026-12-01', 'Opening stock'),
    (p_diaper,   'in',  35, 'DP-2405', '2027-05-01', 'Opening stock'),
    (p_adult,    'in',  18, 'AD-2404', '2027-04-01', 'Opening stock'),
    (p_tissue,   'in',  50, 'WW-2406', '2026-12-01', 'Opening stock');

  -- ---- Suppliers ----------------------------------------------------------
  insert into public.suppliers (name, phone, address, gstin)
  values ('P&G Distributors', '+91 90000 11111', 'Ahmedabad, Gujarat', '24PGXXX1234A1Z0')
  returning id into s_pg;
  insert into public.suppliers (name, phone, address, gstin)
  values ('J&J Wholesale', '+91 90000 22222', 'Mumbai, Maharashtra', '27JJXXX5678B1Z9')
  returning id into s_jnj;

  -- ---- Customers ----------------------------------------------------------
  insert into public.customers (name, phone, address, customer_type)
  values ('Walk-in Retail', '', '', 'retail') returning id into c_retail;
  insert into public.customers (name, phone, address, customer_type)
  values ('Mehta General Store', '+91 99887 77665', 'Katargam, Surat', 'wholesale') returning id into c_whole;
  insert into public.customers (name, phone, address, customer_type)
  values ('City Care Clinic', '+91 99776 66554', 'Adajan, Surat', 'wholesale') returning id into c_clinic;

  -- ---- Sales (items trigger writes the 'out' stock entries) ---------------
  -- Sale 1: retail, cash. 2x Whisper @45 + 1x Carefree @30 = 120.00
  insert into public.sales (customer_id, invoice_no, subtotal_paise, discount_paise, total_paise, payment_mode)
  values (c_retail, 'SHM-000001', 12000, 0, 12000, 'cash') returning id into sale1;
  insert into public.sale_items (sale_id, product_id, quantity, unit_price_paise, total_paise) values
    (sale1, p_whisper,  2, 4500, 9000),
    (sale1, p_carefree, 1, 3000, 3000);

  -- Sale 2: wholesale, credit. 76.00 subtotal, 10.00 discount = 75.00
  insert into public.sales (customer_id, invoice_no, subtotal_paise, discount_paise, total_paise, payment_mode)
  values (c_whole, 'SHM-000002', 76200, 1200, 75000, 'credit') returning id into sale2;
  insert into public.sale_items (sale_id, product_id, quantity, unit_price_paise, total_paise) values
    (sale2, p_whisper,  10, 3800, 38000),
    (sale2, p_stayfree, 10, 3400, 34000),
    (sale2, p_liner,     2, 2100,  4200);

  -- Sale 3: clinic, credit. 1x Cup @340 + 2x Adult @170 = 680.00
  insert into public.sales (customer_id, invoice_no, subtotal_paise, discount_paise, total_paise, payment_mode)
  values (c_clinic, 'SHM-000003', 68000, 0, 68000, 'credit') returning id into sale3;
  insert into public.sale_items (sale_id, product_id, quantity, unit_price_paise, total_paise) values
    (sale3, p_cup,   1, 34000, 34000),
    (sale3, p_adult, 2, 17000, 34000);

  -- advance invoice sequence past the seeded numbers
  perform setval('public.sales_invoice_seq', 3, true);

  -- ---- Customer payment against credit ------------------------------------
  insert into public.customer_payments (customer_id, amount_paise, note)
  values (c_whole, 50000, 'Part payment by UPI');

  -- ---- Expenses -----------------------------------------------------------
  insert into public.expenses (category, amount_paise, note, date) values
    ('rent',      1500000, 'Shop rent',        current_date),
    ('salary',     800000, 'Staff salary',     current_date),
    ('transport',  120000, 'Delivery van fuel', current_date),
    ('utility',     45000, 'Electricity bill', current_date - 1),
    ('marketing',   30000, 'Pamphlet printing', current_date - 2);

  -- ---- Purchase (items trigger writes 'in' stock + updates cost price) -----
  declare pur uuid;
  begin
    insert into public.purchases (supplier_id, invoice_no, total_amount_paise, transport_cost_paise)
    values (s_pg, 'PINV-5567', 0, 50000) returning id into pur;
    insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost_paise, batch_no, expiry_date) values
      (pur, p_whisper, 50, 3200, 'WH-2407', '2027-07-01'),
      (pur, p_pads_xl, 40, 4000, 'WX-2407', '2027-07-01');
    update public.purchases set total_amount_paise = (50*3200 + 40*4000 + 50000) where id = pur;
  end;
end $$;

-- Run once in the Supabase SQL editor of the NEW project.
-- Public bucket for product / banner / QR images (only the URL is stored in the tables).
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read products" on storage.objects;
create policy "Public read products" on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists "Authenticated upload products" on storage.objects;
create policy "Authenticated upload products" on storage.objects
  for insert to authenticated with check (bucket_id = 'products');

drop policy if exists "Authenticated update products" on storage.objects;
create policy "Authenticated update products" on storage.objects
  for update to authenticated using (bucket_id = 'products');

drop policy if exists "Authenticated delete products" on storage.objects;
create policy "Authenticated delete products" on storage.objects
  for delete to authenticated using (bucket_id = 'products');

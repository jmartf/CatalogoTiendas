alter table public.stores
  add column if not exists whatsapp_phone text
  check (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{8,15}$');

alter table public.branches
  add column if not exists whatsapp_phone text
  check (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{8,15}$');

create or replace function private.is_public_product(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    join public.stores s on s.id = p.store_id
    left join public.branches b on b.id = p.branch_id
    where p.id = target_product_id
      and p.active
      and p.status in ('available', 'reserved')
      and s.active
      and (p.branch_id is null or b.active)
  );
$$;

revoke all on function private.is_public_product(uuid) from public;
grant usage on schema private to anon;
grant execute on function private.is_public_product(uuid) to anon;
grant execute on function private.storage_product_id(text) to anon;

grant select on public.stores, public.branches, public.categories, public.sizes,
  public.brands, public.colors, public.products, public.product_images to anon;

create policy stores_public_read on public.stores
for select to anon using (active);
create policy branches_public_read on public.branches
for select to anon using (active);
create policy categories_public_read on public.categories
for select to anon using (active);
create policy sizes_public_read on public.sizes
for select to anon using (active);
create policy brands_public_read on public.brands
for select to anon using (active);
create policy colors_public_read on public.colors
for select to anon using (active);

create policy products_public_read on public.products
for select to anon
using ((select private.is_public_product(id)));

create policy product_images_public_read on public.product_images
for select to anon
using ((select private.is_public_product(product_id)));

create policy product_images_storage_public_read on storage.objects
for select to anon
using (
  bucket_id = 'product-images'
  and (select private.is_public_product(private.storage_product_id(name)))
);

comment on function private.is_public_product(uuid) is
  'Única regla pública: producto y ubicación activos, estado disponible o reservado.';

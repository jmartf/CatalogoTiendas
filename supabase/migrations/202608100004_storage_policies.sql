insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  6291456,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_product_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return nullif(split_part(object_name, '/', 1), '')::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function private.storage_product_id(text) from public, anon;
grant execute on function private.storage_product_id(text) to authenticated;

create policy product_images_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'product-images'
  and (select private.can_read_product(private.storage_product_id(name)))
);

create policy product_images_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and owner_id = (select auth.uid()::text)
  and (select private.can_read_product(private.storage_product_id(name)))
);

create policy product_images_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images'
  and (select private.can_read_product(private.storage_product_id(name)))
)
with check (
  bucket_id = 'product-images'
  and (select private.can_read_product(private.storage_product_id(name)))
);

create policy product_images_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select private.can_read_product(private.storage_product_id(name)))
);

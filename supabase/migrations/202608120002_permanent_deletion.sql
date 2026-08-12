-- Eliminaciones permanentes administradas. Devuelven las rutas de imágenes
-- para que la Edge Function también limpie Storage con service_role.
create or replace function public.admin_delete_product(target_product_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare image_paths text[];
begin
  if not private.is_admin() then raise exception 'Solo un administrador puede eliminar productos.' using errcode = '42501'; end if;
  select coalesce(array_agg(storage_path), array[]::text[]) into image_paths
  from public.product_images where product_id = target_product_id;
  delete from public.products where id = target_product_id;
  if not found then raise exception 'El producto no existe.'; end if;
  return image_paths;
end;
$$;

create or replace function public.admin_delete_store(target_store_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare image_paths text[];
begin
  if not private.is_admin() then raise exception 'Solo un administrador puede eliminar tiendas.' using errcode = '42501'; end if;
  select coalesce(array_agg(pi.storage_path), array[]::text[]) into image_paths
  from public.product_images pi join public.products p on p.id = pi.product_id
  where p.store_id = target_store_id;

  delete from public.products where store_id = target_store_id;
  delete from public.branch_product_counters where branch_id in (select id from public.branches where store_id = target_store_id);
  delete from public.store_product_counters where store_id = target_store_id;
  delete from public.branches where store_id = target_store_id;
  delete from public.stores where id = target_store_id;
  if not found then raise exception 'La tienda no existe.'; end if;
  return image_paths;
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public, anon;
revoke all on function public.admin_delete_store(uuid) from public, anon;
grant execute on function public.admin_delete_product(uuid) to authenticated;
grant execute on function public.admin_delete_store(uuid) to authenticated;


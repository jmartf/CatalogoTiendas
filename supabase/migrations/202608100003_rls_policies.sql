alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.branches enable row level security;
alter table public.categories enable row level security;
alter table public.sizes enable row level security;
alter table public.brands enable row level security;
alter table public.colors enable row level security;
alter table public.user_store_permissions enable row level security;
alter table public.user_branch_permissions enable row level security;
alter table public.store_product_counters enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

revoke all on all tables in schema public from anon;
grant select on public.profiles, public.stores, public.branches, public.categories, public.sizes, public.brands, public.colors, public.user_store_permissions, public.user_branch_permissions, public.products, public.product_images to authenticated;
grant insert, update on public.stores, public.branches, public.categories, public.sizes, public.brands, public.colors, public.user_store_permissions, public.user_branch_permissions, public.products, public.product_images to authenticated;
grant update on public.profiles to authenticated;
grant delete on public.user_store_permissions, public.user_branch_permissions to authenticated;

create policy profiles_read_self_or_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_admin_update on public.profiles
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy stores_read_authorized on public.stores
for select to authenticated
using ((select private.is_admin()) or (active and (select private.can_access_store(id))));
create policy stores_admin_insert on public.stores for insert to authenticated
with check ((select private.is_admin()));
create policy stores_admin_update on public.stores for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy branches_read_authorized on public.branches
for select to authenticated
using ((select private.is_admin()) or (active and (select private.can_access_branch(id))));
create policy branches_admin_insert on public.branches for insert to authenticated
with check ((select private.is_admin()));
create policy branches_admin_update on public.branches for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy categories_read_active_users on public.categories for select to authenticated
using ((select private.is_active_user()));
create policy categories_admin_insert on public.categories for insert to authenticated
with check ((select private.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy sizes_read_active_users on public.sizes for select to authenticated
using ((select private.is_active_user()));
create policy sizes_admin_insert on public.sizes for insert to authenticated
with check ((select private.is_admin()));
create policy sizes_admin_update on public.sizes for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy brands_read_active_users on public.brands for select to authenticated
using ((select private.is_active_user()));
create policy brands_admin_insert on public.brands for insert to authenticated
with check ((select private.is_admin()));
create policy brands_admin_update on public.brands for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy colors_read_active_users on public.colors for select to authenticated
using ((select private.is_active_user()));
create policy colors_admin_insert on public.colors for insert to authenticated
with check ((select private.is_admin()));
create policy colors_admin_update on public.colors for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy store_permissions_read_self_or_admin on public.user_store_permissions
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy store_permissions_admin_insert on public.user_store_permissions for insert to authenticated
with check ((select private.is_admin()));
create policy store_permissions_admin_update on public.user_store_permissions for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy store_permissions_admin_delete on public.user_store_permissions for delete to authenticated
using ((select private.is_admin()));

create policy branch_permissions_read_self_or_admin on public.user_branch_permissions
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy branch_permissions_admin_insert on public.user_branch_permissions for insert to authenticated
with check ((select private.is_admin()));
create policy branch_permissions_admin_update on public.user_branch_permissions for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy branch_permissions_admin_delete on public.user_branch_permissions for delete to authenticated
using ((select private.is_admin()));

create policy products_read_authorized on public.products
for select to authenticated
using ((select private.can_access_location(store_id, branch_id)));
create policy products_insert_authorized on public.products
for insert to authenticated
with check (
  (select private.can_access_location(store_id, branch_id))
  and created_by = (select auth.uid())
);
create policy products_update_authorized on public.products
for update to authenticated
using ((select private.can_access_location(store_id, branch_id)))
with check ((select private.can_access_location(store_id, branch_id)));

create policy product_images_read_authorized on public.product_images
for select to authenticated
using ((select private.can_read_product(product_id)));
create policy product_images_insert_authorized on public.product_images
for insert to authenticated
with check ((select private.can_read_product(product_id)) and uploaded_by = (select auth.uid()));
create policy product_images_update_authorized on public.product_images
for update to authenticated
using ((select private.can_read_product(product_id)))
with check ((select private.can_read_product(product_id)));

-- No se conceden permisos al cliente para store_product_counters ni DELETE de datos históricos.

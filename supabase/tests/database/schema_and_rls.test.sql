begin;
select plan(18);

select has_table('public', 'profiles', 'Existe profiles');
select has_table('public', 'stores', 'Existe stores');
select has_table('public', 'branches', 'Existe branches');
select has_table('public', 'products', 'Existe products');
select has_table('public', 'product_images', 'Existe product_images');
select has_table('public', 'user_store_permissions', 'Existen permisos por tienda');
select has_table('public', 'user_branch_permissions', 'Existen permisos por sucursal');

select policies_are('public', 'profiles', array['profiles_admin_update', 'profiles_read_self_or_admin']);
select policies_are('public', 'stores', array['stores_admin_insert', 'stores_admin_update', 'stores_read_authorized']);
select policies_are('public', 'branches', array['branches_admin_insert', 'branches_admin_update', 'branches_read_authorized']);
select policies_are('public', 'products', array['products_insert_authorized', 'products_read_authorized', 'products_update_authorized']);

select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true, 'RLS activo en profiles');
select is((select relrowsecurity from pg_class where oid = 'public.stores'::regclass), true, 'RLS activo en stores');
select is((select relrowsecurity from pg_class where oid = 'public.branches'::regclass), true, 'RLS activo en branches');
select is((select relrowsecurity from pg_class where oid = 'public.products'::regclass), true, 'RLS activo en products');
select is((select relrowsecurity from pg_class where oid = 'public.product_images'::regclass), true, 'RLS activo en product_images');

select function_returns('private', 'is_admin', array[]::text[], 'boolean', 'is_admin devuelve boolean');
select function_returns('private', 'can_access_location', array['uuid', 'uuid'], 'boolean', 'can_access_location devuelve boolean');

select * from finish();
rollback;

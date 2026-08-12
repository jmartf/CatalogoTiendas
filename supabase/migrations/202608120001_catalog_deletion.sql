-- Permite a los administradores eliminar catálogos sin destruir datos relacionados.
-- Las claves foráneas existentes bloquean automáticamente cualquier registro en uso.
grant delete on public.stores, public.branches, public.categories,
  public.sizes, public.product_names to authenticated;

create policy stores_admin_delete on public.stores
for delete to authenticated using ((select private.is_admin()));

create policy branches_admin_delete on public.branches
for delete to authenticated using ((select private.is_admin()));

create policy categories_admin_delete on public.categories
for delete to authenticated using ((select private.is_admin()));

create policy sizes_admin_delete on public.sizes
for delete to authenticated using ((select private.is_admin()));

create policy product_names_admin_delete on public.product_names
for delete to authenticated using ((select private.is_admin()));


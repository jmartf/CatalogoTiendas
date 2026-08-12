-- Ver la tienda padre es necesario para construir el formulario, pero no debe
-- equivaler a poder crear productos sin sucursal o acceder a toda la tienda.
create or replace function private.can_view_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.is_active_user() and (
      exists (
        select 1 from public.user_store_permissions usp
        where usp.user_id = (select auth.uid())
          and usp.store_id = target_store_id
      )
      or exists (
        select 1
        from public.user_branch_permissions ubp
        join public.branches b on b.id = ubp.branch_id
        where ubp.user_id = (select auth.uid())
          and b.store_id = target_store_id
      )
    )
  );
$$;

revoke all on function private.can_view_store(uuid) from public, anon;
grant execute on function private.can_view_store(uuid) to authenticated;

drop policy if exists stores_read_authorized on public.stores;
create policy stores_read_authorized on public.stores
for select to authenticated
using ((select private.can_view_store(id)));

comment on function private.can_view_store(uuid) is
  'Permite mostrar la tienda padre de una sucursal autorizada sin conceder acceso completo a la tienda.';

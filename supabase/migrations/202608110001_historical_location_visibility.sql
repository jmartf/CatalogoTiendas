-- Los empleados autorizados necesitan ver nombres de tiendas y sucursales
-- inactivas cuando aparecen en productos históricos. La interfaz continúa
-- excluyéndolas de las opciones para productos nuevos.
drop policy if exists stores_read_authorized on public.stores;
create policy stores_read_authorized on public.stores
for select to authenticated
using ((select private.is_admin()) or (select private.can_access_store(id)));

drop policy if exists branches_read_authorized on public.branches;
create policy branches_read_authorized on public.branches
for select to authenticated
using ((select private.is_admin()) or (select private.can_access_branch(id)));

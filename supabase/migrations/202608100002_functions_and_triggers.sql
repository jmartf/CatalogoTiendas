create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger stores_set_updated_at before update on public.stores
for each row execute function private.set_updated_at();
create trigger branches_set_updated_at before update on public.branches
for each row execute function private.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function private.set_updated_at();
create trigger sizes_set_updated_at before update on public.sizes
for each row execute function private.set_updated_at();
create trigger brands_set_updated_at before update on public.brands
for each row execute function private.set_updated_at();
create trigger colors_set_updated_at before update on public.colors
for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'Usuario'), '@', 1)),
    'employee',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active and role = 'admin'
  );
$$;

create or replace function private.can_access_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.is_active_user() and exists (
      select 1 from public.user_store_permissions
      where user_id = (select auth.uid()) and store_id = target_store_id
    )
  );
$$;

create or replace function private.can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.is_active_user() and (
      exists (
        select 1 from public.user_branch_permissions
        where user_id = (select auth.uid()) and branch_id = target_branch_id
      )
      or exists (
        select 1
        from public.branches b
        join public.user_store_permissions usp on usp.store_id = b.store_id
        where b.id = target_branch_id and usp.user_id = (select auth.uid())
      )
    )
  );
$$;

create or replace function private.can_access_location(target_store_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_branch_id is null then private.can_access_store(target_store_id)
    else private.can_access_branch(target_branch_id)
  end;
$$;

create or replace function private.can_read_product(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.products p
    where p.id = target_product_id
      and private.can_access_location(p.store_id, p.branch_id)
  );
$$;

create or replace function private.prepare_new_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number bigint;
  prefix text;
begin
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;

  select s.code_prefix into prefix
  from public.stores s
  where s.id = new.store_id and s.active;

  if prefix is null then
    raise exception 'La tienda seleccionada no existe o está inactiva.';
  end if;

  if new.branch_id is not null and not exists (
    select 1 from public.branches b
    where b.id = new.branch_id and b.store_id = new.store_id and b.active
  ) then
    raise exception 'La sucursal seleccionada no existe, está inactiva o pertenece a otra tienda.';
  end if;

  if not exists (select 1 from public.categories where id = new.category_id and active) then
    raise exception 'La categoría seleccionada no existe o está inactiva.';
  end if;
  if new.size_id is not null and not exists (select 1 from public.sizes where id = new.size_id and active) then
    raise exception 'La talla seleccionada no existe o está inactiva.';
  end if;
  if new.brand_id is not null and not exists (select 1 from public.brands where id = new.brand_id and active) then
    raise exception 'La marca seleccionada no existe o está inactiva.';
  end if;
  if new.color_id is not null and not exists (select 1 from public.colors where id = new.color_id and active) then
    raise exception 'El color seleccionado no existe o está inactivo.';
  end if;

  insert into public.store_product_counters (store_id, last_number)
  values (new.store_id, 1)
  on conflict (store_id) do update
    set last_number = public.store_product_counters.last_number + 1
  returning last_number into next_number;

  new.code := prefix || '-' || lpad(next_number::text, 5, '0');
  return new;
end;
$$;

create trigger products_prepare_insert
before insert on public.products
for each row execute function private.prepare_new_product();

create or replace function private.validate_product_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Campos asignados por PostgreSQL: nunca se aceptan cambios desde el cliente.
  new.code := old.code;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if new.store_id is distinct from old.store_id then
    if not exists (select 1 from public.stores where id = new.store_id and active) then
      raise exception 'La tienda seleccionada no existe o está inactiva.';
    end if;
  end if;

  if new.branch_id is distinct from old.branch_id or new.store_id is distinct from old.store_id then
    if new.branch_id is not null and not exists (
      select 1 from public.branches b
      where b.id = new.branch_id and b.store_id = new.store_id and b.active
    ) then
      raise exception 'La sucursal seleccionada no existe, está inactiva o pertenece a otra tienda.';
    end if;
  end if;

  if new.category_id is distinct from old.category_id
     and not exists (select 1 from public.categories where id = new.category_id and active) then
    raise exception 'La categoría seleccionada no existe o está inactiva.';
  end if;
  if new.size_id is distinct from old.size_id and new.size_id is not null
     and not exists (select 1 from public.sizes where id = new.size_id and active) then
    raise exception 'La talla seleccionada no existe o está inactiva.';
  end if;
  if new.brand_id is distinct from old.brand_id and new.brand_id is not null
     and not exists (select 1 from public.brands where id = new.brand_id and active) then
    raise exception 'La marca seleccionada no existe o está inactiva.';
  end if;
  if new.color_id is distinct from old.color_id and new.color_id is not null
     and not exists (select 1 from public.colors where id = new.color_id and active) then
    raise exception 'El color seleccionado no existe o está inactivo.';
  end if;

  return new;
end;
$$;

create trigger products_validate_update
before update on public.products
for each row execute function private.validate_product_update();

create or replace function private.sync_product_sold_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := now();
  elsif new.status <> 'sold' and old.status = 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

create trigger products_sync_sold_at
before update of status on public.products
for each row execute function private.sync_product_sold_at();

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_access_store(uuid) to authenticated;
grant execute on function private.can_access_branch(uuid) to authenticated;
grant execute on function private.can_access_location(uuid, uuid) to authenticated;
grant execute on function private.can_read_product(uuid) to authenticated;

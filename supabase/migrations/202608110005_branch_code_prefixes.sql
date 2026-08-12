alter table public.branches
  add column if not exists code_prefix text
  check (code_prefix is null or code_prefix ~ '^[A-Z0-9]{2,8}$');

create unique index if not exists branches_code_prefix_unique
  on public.branches (code_prefix)
  where code_prefix is not null;

create table public.branch_product_counters (
  branch_id uuid primary key references public.branches(id) on delete restrict,
  last_number bigint not null default 0 check (last_number >= 0)
);
alter table public.branch_product_counters enable row level security;
-- Tabla técnica: el cliente no recibe permisos ni políticas directas.

create or replace function private.validate_location_code_prefix()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old.code_prefix is not null
     and upper(trim(coalesce(new.code_prefix, ''))) is distinct from old.code_prefix
     and exists (
       select 1 from public.products p
       where p.code like old.code_prefix || '-%'
     ) then
    raise exception 'El prefijo % ya generó productos y no puede modificarse.', old.code_prefix;
  end if;

  if new.code_prefix is null or trim(new.code_prefix) = '' then
    if tg_op = 'INSERT' then
      raise exception 'El prefijo de código es obligatorio.';
    end if;
    new.code_prefix := null;
    return new;
  end if;

  new.code_prefix := upper(trim(new.code_prefix));
  if new.code_prefix !~ '^[A-Z0-9]{2,8}$' then
    raise exception 'El prefijo debe contener entre 2 y 8 letras o números.';
  end if;

  -- Serializa cambios de prefijo para impedir colisiones entre dos tablas.
  perform pg_advisory_xact_lock(hashtext('catalogo-location-code-prefix'));

  if tg_table_name = 'stores' then
    if exists (
      select 1 from public.branches b
      where b.code_prefix = new.code_prefix
    ) then
      raise exception 'El prefijo % ya pertenece a una sucursal.', new.code_prefix;
    end if;
  else
    if exists (
      select 1 from public.stores s
      where s.code_prefix = new.code_prefix
    ) then
      raise exception 'El prefijo % ya pertenece a una tienda.', new.code_prefix;
    end if;
  end if;

  return new;
end;
$$;

create trigger stores_validate_code_prefix
before insert or update of code_prefix on public.stores
for each row execute function private.validate_location_code_prefix();

create trigger branches_validate_code_prefix
before insert or update of code_prefix on public.branches
for each row execute function private.validate_location_code_prefix();

create or replace function private.prepare_new_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number bigint;
  prefix text;
  store_prefix text;
  branch_prefix text;
  use_branch_counter boolean := false;
begin
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;

  select s.code_prefix into store_prefix
  from public.stores s
  where s.id = new.store_id and s.active;

  if store_prefix is null then
    raise exception 'La tienda seleccionada no existe o está inactiva.';
  end if;

  if new.branch_id is not null then
    select b.code_prefix into branch_prefix
    from public.branches b
    where b.id = new.branch_id
      and b.store_id = new.store_id
      and b.active;

    if not found then
      raise exception 'La sucursal seleccionada no existe, está inactiva o pertenece a otra tienda.';
    end if;

    if branch_prefix is not null then
      prefix := branch_prefix;
      use_branch_counter := true;
    else
      -- Compatibilidad temporal para sucursales creadas antes de esta migración.
      prefix := store_prefix;
    end if;
  else
    prefix := store_prefix;
  end if;

  if not exists (select 1 from public.categories where id = new.category_id and active) then
    raise exception 'La categoría seleccionada no existe o está inactiva.';
  end if;
  if new.size_id is not null and not exists (select 1 from public.sizes where id = new.size_id and active) then
    raise exception 'La talla seleccionada no existe o está inactiva.';
  end if;

  if use_branch_counter then
    insert into public.branch_product_counters (branch_id, last_number)
    values (new.branch_id, 1)
    on conflict (branch_id) do update
      set last_number = public.branch_product_counters.last_number + 1
    returning last_number into next_number;
  else
    insert into public.store_product_counters (store_id, last_number)
    values (new.store_id, 1)
    on conflict (store_id) do update
      set last_number = public.store_product_counters.last_number + 1
    returning last_number into next_number;
  end if;

  new.code := prefix || '-' || lpad(next_number::text, 5, '0');
  return new;
end;
$$;

comment on column public.branches.code_prefix is
  'Prefijo opcional para registros históricos; obligatorio en nuevas sucursales mediante trigger.';
comment on table public.branch_product_counters is
  'Contador atómico independiente para cada sucursal con prefijo configurado.';

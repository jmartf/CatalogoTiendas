create table public.product_names (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_names_name_unique_ci on public.product_names (lower(name));

-- Cada título libre existente se convierte en una opción administrable.
insert into public.product_names (name, sort_order)
select min(trim(title)), row_number() over (order by lower(trim(title)))::integer
from public.products
group by lower(trim(title));

alter table public.products add column product_name_id uuid;

update public.products p
set product_name_id = pn.id
from public.product_names pn
where lower(trim(p.title)) = lower(pn.name);

alter table public.products
  alter column product_name_id set not null,
  add constraint products_product_name_id_fkey
    foreign key (product_name_id) references public.product_names(id);
create index products_product_name_id_idx on public.products (product_name_id);

create trigger product_names_set_updated_at
before update on public.product_names
for each row execute function private.set_updated_at();

create or replace function private.sync_product_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_name text;
begin
  if tg_op = 'INSERT' or new.product_name_id is distinct from old.product_name_id then
    select name into selected_name
    from public.product_names
    where id = new.product_name_id and active;

    if selected_name is null then
      raise exception 'El nombre de producto seleccionado no existe o está inactivo.';
    end if;
    new.title := selected_name;
  end if;
  return new;
end;
$$;

create trigger products_sync_product_name
before insert or update of product_name_id on public.products
for each row execute function private.sync_product_name();

create or replace function private.propagate_product_name_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    update public.products
    set title = new.name
    where product_name_id = new.id;
  end if;
  return new;
end;
$$;

create trigger product_names_propagate_name
after update of name on public.product_names
for each row execute function private.propagate_product_name_update();

alter table public.product_names enable row level security;
grant select, insert, update on public.product_names to authenticated;
grant select on public.product_names to anon;

create policy product_names_read_active_users on public.product_names
for select to authenticated
using ((select private.is_active_user()));
create policy product_names_admin_insert on public.product_names
for insert to authenticated
with check ((select private.is_admin()));
create policy product_names_admin_update on public.product_names
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy product_names_public_read on public.product_names
for select to anon using (active);

comment on column public.products.title is
  'Copia histórica sincronizada desde product_names; no se escribe desde el frontend.';
comment on table public.brands is
  'Catálogo legado conservado para no destruir datos históricos; fuera de la interfaz.';
comment on table public.colors is
  'Catálogo legado conservado para no destruir datos históricos; fuera de la interfaz.';

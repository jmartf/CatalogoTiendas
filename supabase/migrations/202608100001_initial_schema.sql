create schema if not exists private;
revoke all on schema private from public, anon;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  role text not null default 'employee' check (role in ('admin', 'employee')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  code_prefix text not null unique check (code_prefix ~ '^[A-Z0-9]{2,8}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index stores_name_unique_ci on public.stores (lower(name));

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  name text not null check (length(trim(name)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id)
);
create unique index branches_store_name_unique_ci on public.branches (store_id, lower(name));
create index branches_store_id_idx on public.branches (store_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_unique_ci on public.categories (lower(name));

create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 50),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sizes_name_unique_ci on public.sizes (lower(name));

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index brands_name_unique_ci on public.brands (lower(name));

create table public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index colors_name_unique_ci on public.colors (lower(name));

create table public.user_store_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);
create index user_store_permissions_store_idx on public.user_store_permissions (store_id, user_id);

create table public.user_branch_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);
create index user_branch_permissions_branch_idx on public.user_branch_permissions (branch_id, user_id);

create table public.store_product_counters (
  store_id uuid primary key references public.stores(id) on delete restrict,
  last_number bigint not null default 0 check (last_number >= 0)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null check (length(trim(title)) between 2 and 160),
  store_id uuid not null references public.stores(id),
  branch_id uuid,
  category_id uuid not null references public.categories(id),
  size_id uuid references public.sizes(id),
  brand_id uuid references public.brands(id),
  color_id uuid references public.colors(id),
  price numeric(12,2) not null check (price >= 0),
  description text,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz,
  active boolean not null default true,
  foreign key (branch_id, store_id) references public.branches(id, store_id)
);
create index products_store_id_idx on public.products (store_id);
create index products_branch_id_idx on public.products (branch_id);
create index products_created_by_idx on public.products (created_by);
create index products_status_idx on public.products (status);
create index products_category_id_idx on public.products (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index product_images_one_primary_idx on public.product_images (product_id) where is_primary;
create index product_images_product_idx on public.product_images (product_id, sort_order);

comment on table public.store_product_counters is 'Contador atómico por tienda; no se modifica desde el cliente.';
comment on column public.products.branch_id is 'Nulo solamente para productos asignados a una tienda completa.';

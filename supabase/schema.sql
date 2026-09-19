-- KHATCH & VALLEY BREWSTILLERY
-- À exécuter une fois dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.order_status as enum (
    'received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'card');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'paid');
exception when duplicate_object then null;
end $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null,
  image_path text not null default '',
  price integer not null check (price >= 0),
  volume_ml integer,
  alcohol_pct numeric(4,1),
  visual_tone text not null default 'amber',
  bottle_style text not null default 'round',
  active boolean not null default true,
  stock_count integer check (stock_count is null or stock_count >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists image_path text not null default '';

create sequence if not exists public.order_number_seq start 1;
create sequence if not exists public.invoice_number_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null,
  phone_normalized text not null,
  delivery_location text not null,
  desired_delivery_at timestamptz,
  notes text,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  status public.order_status not null default 'received',
  total integer not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists desired_delivery_at timestamptz;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 999),
  subtotal integer not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  invoice_number text not null unique,
  issued_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  delivery_location text not null,
  payment_method public.payment_method not null,
  total integer not null check (total >= 0)
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  phone text not null,
  phone_normalized text not null,
  role text not null check (role in ('delivery_driver', 'order_preparer', 'account_manager')),
  availability text not null,
  experience text,
  motivation text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'accepted', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_items drop constraint if exists order_items_quantity_check;
alter table public.order_items
  add constraint order_items_quantity_check check (quantity between 1 and 999);

create index if not exists orders_phone_normalized_idx on public.orders(phone_normalized);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists status_history_order_id_idx on public.order_status_history(order_id, created_at);
create index if not exists invoices_order_id_idx on public.invoices(order_id);
create index if not exists job_applications_status_created_idx on public.job_applications(status, created_at desc);
create index if not exists job_applications_phone_idx on public.job_applications(phone_normalized);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_set_updated_at before update on public.job_applications
for each row execute function public.set_updated_at();

create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status
after insert or update of status on public.orders
for each row execute function public.log_order_status();

create or replace function public.next_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'KV-' || to_char(current_timestamp at time zone 'utc', 'YYMMDD') || '-' ||
    lpad(nextval('public.order_number_seq')::text, 4, '0');
$$;

create or replace function public.next_invoice_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'KVF-' || to_char(current_timestamp at time zone 'utc', 'YYMMDD') || '-' ||
    lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

revoke all on function public.next_invoice_number() from public, anon, authenticated;
grant execute on function public.next_invoice_number() to service_role;

create or replace function public.create_order_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered' and old.status is distinct from new.status then
    insert into public.invoices (
      order_id, invoice_number, customer_name, customer_phone,
      delivery_location, payment_method, total
    ) values (
      new.id, public.next_invoice_number(), new.customer_name, new.phone,
      new.delivery_location, new.payment_method, new.total
    ) on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_create_invoice on public.orders;
create trigger orders_create_invoice
after update of status on public.orders
for each row execute function public.create_order_invoice();

drop function if exists public.place_order(text, text, text, public.payment_method, text, jsonb);

create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_location text,
  p_desired_delivery_at timestamptz,
  p_payment_method public.payment_method,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_total integer := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
begin
  if length(trim(p_customer_name)) < 2 or length(trim(p_customer_name)) > 80 then
    raise exception 'invalid customer name';
  end if;
  if length(regexp_replace(p_phone, '\D', '', 'g')) < 4 then
    raise exception 'invalid phone';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid basket';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 999 then raise exception 'invalid quantity'; end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid and active = true
    for update;

    if not found then raise exception 'product unavailable'; end if;
    if v_product.stock_count is not null and v_product.stock_count < v_quantity then
      raise exception 'insufficient stock';
    end if;
    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  v_order_number := public.next_order_number();
  insert into public.orders (
    order_number, customer_name, phone, phone_normalized, delivery_location,
    desired_delivery_at, notes, payment_method, total
  ) values (
    v_order_number,
    trim(p_customer_name),
    trim(p_phone),
    regexp_replace(p_phone, '\D', '', 'g'),
    trim(p_delivery_location),
    p_desired_delivery_at,
    nullif(trim(p_notes), ''),
    p_payment_method,
    v_total
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity, subtotal
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.price,
      v_quantity, v_product.price * v_quantity
    );

    if v_product.stock_count is not null then
      update public.products
      set stock_count = stock_count - v_quantity
      where id = v_product.id;
    end if;
  end loop;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total', v_total
  );
end;
$$;

revoke all on function public.place_order(text, text, text, timestamptz, public.payment_method, text, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text, text, text, timestamptz, public.payment_method, text, jsonb) to service_role;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.job_applications enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products for select to anon, authenticated
using (active = true);

drop policy if exists "admin can read own profile" on public.admin_profiles;
create policy "admin can read own profile"
on public.admin_profiles for select to authenticated
using (auth.uid() = user_id);

insert into public.products (
  id, slug, name, category, description, image_path, price, volume_ml, alcohol_pct,
  visual_tone, bottle_style, active, sort_order
) values
  ('11111111-1111-4111-8111-111111111111', 'khatch-lager', 'Khatch Lager', 'Bière', 'Lager blonde légère, sèche et très clean.', '/products/khatch-lager.png', 45, 330, 5, 'amber', 'beer', true, 1),
  ('22222222-2222-4222-8222-222222222222', 'khatch-valley-whisky', 'Khatch Valley Whisky', 'Whisky', 'American whiskey avec maturation en fûts de chêne arménien.', '/products/khatch-valley-whisky.png', 180, 700, 42, 'oak', 'square', true, 2),
  ('33333333-3333-4333-8333-333333333333', 'khatch-vodka', 'Khatch Vodka', 'Vodka', 'Vodka ultra-pure à base de blé, finition très douce.', '/products/khatch-vodka.png', 120, 700, 40, 'clear', 'square', true, 3),
  ('44444444-4444-4444-8444-444444444444', 'khatch-botanical-gin', 'Khatch Botanical Gin', 'Gin', 'Gin aux botaniques arméniennes : genièvre, abricot sec et herbes sauvages.', '/products/khatch-botanical-gin.png', 150, 700, 41, 'mist', 'round', true, 4),
  ('55555555-5555-4555-8555-555555555555', 'valley-rum', 'Valley Rum', 'Rhum', 'Rhum ambré, pensé autour de notes vanillées et fruitées.', '/products/valley-rum.png', 165, 700, 40, 'rum', 'round', true, 5),
  ('66666666-6666-4666-8666-666666666666', 'khatch-blanco', 'Khatch Blanco', 'Tequila', 'Tequila blanco premium, identité très minimaliste.', '/products/khatch-blanco.png', 190, 700, 40, 'silver', 'round', true, 6),
  ('77777777-7777-4777-8777-777777777777', 'khatch-armenian-brandy', 'Khatch Armenian Brandy', 'Brandy', 'Brandy de raisin, inspiré de la tradition arménienne.', '/products/khatch-armenian-brandy.png', 240, 700, 43, 'brandy', 'round', true, 7),
  ('88888888-8888-4888-8888-888888888888', 'tsiran', 'Tsiran', 'Liqueur', 'Liqueur d’abricot arménien, ronde et délicatement fruitée.', '/products/tsiran.png', 135, 500, 28, 'apricot', 'round', true, 8)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  image_path = excluded.image_path,
  volume_ml = excluded.volume_ml,
  alcohol_pct = excluded.alcohol_pct,
  visual_tone = excluded.visual_tone,
  bottle_style = excluded.bottle_style,
  sort_order = excluded.sort_order;

-- APRÈS avoir créé le compte dans Supabase > Authentication > Users,
-- remplacez l'UUID ci-dessous puis exécutez uniquement la ligne INSERT :
-- insert into public.admin_profiles (user_id, display_name)
-- values ('UUID_DU_COMPTE_AUTH', 'Khatchadourian');

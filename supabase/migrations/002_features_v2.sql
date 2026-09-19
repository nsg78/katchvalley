-- KHATCH & VALLEY — MISE À JOUR V2
-- À exécuter dans Supabase > SQL Editor pour un site V1 déjà installé.

create sequence if not exists public.invoice_number_seq start 1;

alter table public.orders
  add column if not exists desired_delivery_at timestamptz;

alter table public.order_items drop constraint if exists order_items_quantity_check;
alter table public.order_items
  add constraint order_items_quantity_check check (quantity between 1 and 999);

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

create index if not exists invoices_order_id_idx on public.invoices(order_id);
create index if not exists job_applications_status_created_idx on public.job_applications(status, created_at desc);
create index if not exists job_applications_phone_idx on public.job_applications(phone_normalized);

drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_set_updated_at before update on public.job_applications
for each row execute function public.set_updated_at();

create or replace function public.next_invoice_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'KVF-' || to_char(current_timestamp at time zone 'utc', 'YYMMDD') || '-' ||
    lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

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

insert into public.invoices (
  order_id, invoice_number, issued_at, customer_name, customer_phone,
  delivery_location, payment_method, total
)
select
  id, public.next_invoice_number(), updated_at, customer_name, phone,
  delivery_location, payment_method, total
from public.orders
where status = 'delivered'
on conflict (order_id) do nothing;

alter table public.invoices enable row level security;
alter table public.job_applications enable row level security;

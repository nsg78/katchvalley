-- KHATCH & VALLEY — RÉPARATION ET RATTRAPAGE DES FACTURES
-- À exécuter dans Supabase > SQL Editor si une commande livrée n'affiche aucune facture.

create sequence if not exists public.invoice_number_seq start 1;

alter table public.orders
  add column if not exists desired_delivery_at timestamptz;

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

create index if not exists invoices_order_id_idx on public.invoices(order_id);

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

notify pgrst, 'reload schema';

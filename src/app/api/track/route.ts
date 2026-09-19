import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase/server";
import type { Invoice, Order } from "@/lib/types";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({
  phone: z.string().trim().min(4).max(20).refine((value) => value.replace(/\D/g, "").length >= 4)
});

function isLegacyDatabaseError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return ["PGRST200", "PGRST204", "42703", "42P01"].includes(error.code || "")
    || /desired_delivery_at|invoices/i.test(error.message || "");
}

async function ensureDeliveredInvoice(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  order: Order
): Promise<Order> {
  if (order.status !== "delivered" || order.invoices?.length) return order;

  const { data: invoiceNumber, error: numberError } = await supabase.rpc("next_invoice_number");
  if (numberError || typeof invoiceNumber !== "string") {
    console.error("invoice number generation failed", numberError);
    return order;
  }

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      order_id: order.id,
      invoice_number: invoiceNumber,
      customer_name: order.customer_name,
      customer_phone: order.phone,
      delivery_location: order.delivery_location,
      payment_method: order.payment_method,
      total: order.total
    })
    .select("*")
    .single();

  if (!insertError && invoice) return { ...order, invoices: [invoice as Invoice] };

  const { data: existing } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return { ...order, invoices: [existing as Invoice] };

  console.error("invoice repair failed", insertError);
  return order;
}

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Le suivi n’est pas encore configuré." }, { status: 503 });

  let phone: string;
  try {
    phone = normalizePhone(schema.parse(await request.json()).phone);
  } catch {
    return NextResponse.json({ error: "Saisissez un numéro de téléphone valide." }, { status: 400 });
  }

  const modernResult = await supabase
    .from("orders")
    .select("id, order_number, customer_name, phone, delivery_location, desired_delivery_at, notes, payment_method, payment_status, status, total, created_at, updated_at, order_items(*), order_status_history(*), invoices(*)")
    .eq("phone_normalized", phone)
    .order("created_at", { ascending: false })
    .limit(10);
  let data = modernResult.data;
  let error = modernResult.error;
  let legacyDatabase = false;

  if (isLegacyDatabaseError(error)) {
    legacyDatabase = true;
    const legacyResult = await supabase
      .from("orders")
      .select("id, order_number, customer_name, phone, delivery_location, notes, payment_method, payment_status, status, total, created_at, updated_at, order_items(*), order_status_history(*)")
      .eq("phone_normalized", phone)
      .order("created_at", { ascending: false })
      .limit(10);
    data = legacyResult.data?.map((order) => ({
      ...order,
      desired_delivery_at: null,
      invoices: []
    })) || null;
    error = legacyResult.error;
  }

  if (error) {
    console.error("track order failed", error);
    return NextResponse.json({ error: "Le suivi est momentanément indisponible." }, { status: 500 });
  }

  const orders = (data || []) as Order[];
  const completedOrders = legacyDatabase
    ? orders
    : await Promise.all(orders.map((order) => ensureDeliveredInvoice(supabase, order)));

  return NextResponse.json({ orders: completedOrders });
}

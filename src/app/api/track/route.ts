import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({ phone: z.string().trim().min(7).max(24) });

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Le suivi n’est pas encore configuré." }, { status: 503 });

  let phone: string;
  try {
    phone = normalizePhone(schema.parse(await request.json()).phone);
  } catch {
    return NextResponse.json({ error: "Saisissez un numéro de téléphone valide." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, phone, delivery_location, notes, payment_method, payment_status, status, total, created_at, updated_at, order_items(*), order_status_history(*)")
    .eq("phone_normalized", phone)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("track order failed", error);
    return NextResponse.json({ error: "Le suivi est momentanément indisponible." }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyNewOrder } from "@/lib/notifications";
import { getServiceClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(24),
  deliveryLocation: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(500).optional().default(""),
  website: z.string().max(0).optional().default(""),
  paymentMethod: z.enum(["cash", "card"]),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(50)
  })).min(1).max(20)
});

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "La prise de commande n’est pas encore connectée. Configurez Supabase dans Vercel." },
      { status: 503 }
    );
  }

  let payload: z.infer<typeof orderSchema>;
  try {
    payload = orderSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Certaines informations de la commande sont invalides." }, { status: 400 });
  }

  const { data: placed, error: placeError } = await supabase.rpc("place_order", {
    p_customer_name: payload.customerName,
    p_phone: payload.phone,
    p_delivery_location: payload.deliveryLocation,
    p_payment_method: payload.paymentMethod,
    p_notes: payload.notes || null,
    p_items: payload.items.map((item) => ({ product_id: item.productId, quantity: item.quantity }))
  });

  if (placeError || !placed?.id) {
    console.error("place_order failed", placeError);
    return NextResponse.json({ error: "La commande n’a pas pu être enregistrée. Réessayez dans un instant." }, { status: 500 });
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", placed.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Commande créée, mais sa confirmation n’a pas pu être chargée." }, { status: 500 });
  }

  await notifyNewOrder(order as Order);
  return NextResponse.json({ order }, { status: 201 });
}

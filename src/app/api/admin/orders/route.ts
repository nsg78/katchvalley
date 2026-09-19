import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["received", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]).optional(),
  paymentStatus: z.enum(["pending", "paid"]).optional()
}).refine((value) => value.status || value.paymentStatus, { message: "No update" });

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await admin.supabase
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: "Chargement impossible" }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let payload: z.infer<typeof patchSchema>;
  try {
    payload = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Modification invalide" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (payload.status) updates.status = payload.status;
  if (payload.paymentStatus) updates.payment_status = payload.paymentStatus;

  const { data, error } = await admin.supabase
    .from("orders")
    .update(updates)
    .eq("id", payload.id)
    .select("*, order_items(*), order_status_history(*)")
    .single();

  if (error) return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  return NextResponse.json({ order: data });
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  id: z.string().uuid(),
  price: z.number().int().min(0).max(100000).optional(),
  active: z.boolean().optional(),
  stock_count: z.number().int().min(0).nullable().optional()
}).refine((value) => value.price !== undefined || value.active !== undefined || value.stock_count !== undefined);

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await admin.supabase.from("products").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: "Chargement impossible" }, { status: 500 });
  return NextResponse.json({ products: data || [] });
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

  const { id, ...updates } = payload;
  const { data, error } = await admin.supabase.from("products").update(updates).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  return NextResponse.json({ product: data });
}

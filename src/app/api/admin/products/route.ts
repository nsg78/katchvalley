import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const productFields = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(500),
  image_path: z.string().trim().min(1).max(500),
  price: z.number().int().min(0).max(100000).optional(),
  volume_ml: z.number().int().min(1).max(10000).nullable(),
  alcohol_pct: z.number().min(0).max(100).nullable(),
  visual_tone: z.enum(["amber", "oak", "clear", "mist", "rum", "silver", "brandy", "apricot"]),
  bottle_style: z.enum(["round", "square", "beer"]),
  active: z.boolean(),
  stock_count: z.number().int().min(0).max(100000).nullable(),
  sort_order: z.number().int().min(0).max(10000)
});

const createSchema = productFields.extend({ price: z.number().int().min(0).max(100000) });
const patchSchema = productFields.partial().extend({ id: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== "id"));

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "produit";
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await admin.supabase.from("products").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: "Chargement impossible" }, { status: 500 });
  return NextResponse.json({ products: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Informations du produit invalides" }, { status: 400 });
  }

  const baseSlug = slugify(payload.name);
  const { data: existing } = await admin.supabase
    .from("products")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();
  const slug = existing ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

  const { data, error } = await admin.supabase
    .from("products")
    .insert({ ...payload, slug })
    .select("*")
    .single();

  if (error) {
    console.error("product creation failed", error);
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  return NextResponse.json({ product: data }, { status: 201 });
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

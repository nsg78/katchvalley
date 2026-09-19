import { NextResponse } from "next/server";
import { FALLBACK_PRODUCTS } from "@/lib/catalog";
import { getServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ products: FALLBACK_PRODUCTS, source: "fallback" });

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category, description, image_path, price, volume_ml, alcohol_pct, visual_tone, bottle_style, active, stock_count, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    return NextResponse.json({ products: FALLBACK_PRODUCTS, source: "fallback" });
  }

  return NextResponse.json({ products: data, source: "supabase" });
}

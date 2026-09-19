import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image PNG, JPG ou WebP de 5 Mo maximum requise." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES.get(file.type);
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const { error } = await admin.supabase.storage
    .from("product-images")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (error) {
    console.error("product image upload failed", error);
    return NextResponse.json({ error: "L’image n’a pas pu être envoyée. Vérifiez la migration Supabase 003." }, { status: 500 });
  }

  const { data } = admin.supabase.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ imagePath: data.publicUrl }, { status: 201 });
}

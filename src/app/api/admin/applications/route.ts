import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "reviewing", "contacted", "accepted", "rejected"]).optional(),
  adminNotes: z.string().trim().max(1000).nullable().optional()
}).refine((value) => value.status !== undefined || value.adminNotes !== undefined, { message: "No update" });

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await admin.supabase
    .from("job_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: "Chargement impossible" }, { status: 500 });
  return NextResponse.json({ applications: data || [] });
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

  const updates: { status?: string; admin_notes?: string | null } = {};
  if (payload.status) updates.status = payload.status;
  if (payload.adminNotes !== undefined) updates.admin_notes = payload.adminNotes || null;

  const { data, error } = await admin.supabase
    .from("job_applications")
    .update(updates)
    .eq("id", payload.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  return NextResponse.json({ application: data });
}

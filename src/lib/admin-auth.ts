import type { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getServiceClient();
  if (!token || !supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("user_id, display_name, role")
    .eq("user_id", authData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!profile) return null;
  return { user: authData.user, profile, supabase };
}

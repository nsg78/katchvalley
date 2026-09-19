import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyNewApplication } from "@/lib/notifications";
import { getServiceClient } from "@/lib/supabase/server";
import type { JobApplication } from "@/lib/types";
import { normalizePhone } from "@/lib/utils";

const applicationSchema = z.object({
  applicantName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(4).max(20).refine((value) => normalizePhone(value).length >= 4),
  role: z.enum(["delivery_driver", "order_preparer", "account_manager"]),
  availability: z.string().trim().min(2).max(200),
  experience: z.string().trim().max(800).optional().default(""),
  motivation: z.string().trim().min(20).max(1500),
  website: z.string().max(0).optional().default("")
});

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Le recrutement n’est pas encore connecté." }, { status: 503 });
  }

  let payload: z.infer<typeof applicationSchema>;
  try {
    payload = applicationSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Certaines informations de la candidature sont invalides." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      applicant_name: payload.applicantName,
      phone: payload.phone,
      phone_normalized: normalizePhone(payload.phone),
      role: payload.role,
      availability: payload.availability,
      experience: payload.experience || null,
      motivation: payload.motivation
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("job application failed", error);
    return NextResponse.json({ error: "La candidature n’a pas pu être transmise." }, { status: 500 });
  }

  await notifyNewApplication(data as JobApplication);
  return NextResponse.json({ application: { id: data.id } }, { status: 201 });
}

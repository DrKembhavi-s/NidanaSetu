import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interpretations")
    .select("id, report_id, status, ai_draft, doctor_final, model_used, generated_at, signed_off_by, signed_off_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ interpretation: data });
}

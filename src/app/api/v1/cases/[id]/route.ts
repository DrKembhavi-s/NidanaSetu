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
    .from("cases")
    .select(
      "id, status, created_at, patients(full_name, dob, sex, external_patient_ref), intake_records(age_at_visit, sex, weight_kg, symptoms, history, completed), reports(id, module_type, uploaded_at)"
    )
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ case: data });
}

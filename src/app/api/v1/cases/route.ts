import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";

// Read-only surface for future MyVaidya integration. Doctor-session-gated
// for now — a dedicated API-key auth layer for that external consumer is
// deliberately deferred until MyVaidya exists to test against.
export async function GET() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select("id, status, created_at, patient_id, patients(full_name, external_patient_ref)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cases: data });
}

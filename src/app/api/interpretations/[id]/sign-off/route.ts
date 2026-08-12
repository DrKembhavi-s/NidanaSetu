import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const doctorFinal = body?.doctor_final;
  if (!doctorFinal || typeof doctorFinal.narrative !== "string") {
    return NextResponse.json(
      { error: "doctor_final.narrative is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: interpretation } = await supabase
    .from("interpretations")
    .select("id, report_id, status, reports(case_id)")
    .eq("id", id)
    .single();

  if (!interpretation) {
    return NextResponse.json({ error: "Interpretation not found." }, { status: 404 });
  }

  const report = Array.isArray(interpretation.reports)
    ? interpretation.reports[0]
    : interpretation.reports;

  const { error: updateError } = await supabase
    .from("interpretations")
    .update({
      doctor_final: doctorFinal,
      status: "signed_off",
      signed_off_by: doctor.id,
      signed_off_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (report?.case_id) {
    await logAuditEvent({
      caseId: report.case_id,
      actorId: doctor.id,
      eventType: "sign_off",
      eventDetail: { interpretation_id: id },
    });
  }

  return NextResponse.json({ ok: true });
}

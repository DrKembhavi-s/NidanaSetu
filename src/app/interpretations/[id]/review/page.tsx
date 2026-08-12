import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";
import { logAuditEvent } from "@/lib/audit";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { ReviewForm } from "./ReviewForm";

type Draft = {
  narrative: string;
  lab_results: { test_name: string; value: string; unit?: string; flag: string }[];
};

export default async function InterpretationReviewPage({
  params,
}: PageProps<"/interpretations/[id]/review">) {
  const { id } = await params;
  const supabase = await createClient();
  const doctor = await getCurrentDoctor();
  if (!doctor) notFound();

  const { data: interpretation } = await supabase
    .from("interpretations")
    .select(
      "id, status, ai_draft, doctor_final, signed_off_at, report_id, reports(case_id), signed_off_by, doctors!interpretations_signed_off_by_fkey(full_name)"
    )
    .eq("id", id)
    .single();

  if (!interpretation) notFound();

  const report = Array.isArray(interpretation.reports)
    ? interpretation.reports[0]
    : interpretation.reports;

  // Log every view of an AI-generated interpretation, per the disclaimer
  // audit requirement, before rendering the content below.
  if (report?.case_id) {
    await logAuditEvent({
      caseId: report.case_id,
      actorId: doctor.id,
      eventType: "disclaimer_displayed",
      eventDetail: { interpretation_id: id },
    });
  }

  const draft = interpretation.ai_draft as Draft;
  const signedOffDoctor = Array.isArray(interpretation.doctors)
    ? interpretation.doctors[0]
    : interpretation.doctors;
  const isSignedOff = interpretation.status === "signed_off";
  const finalData = interpretation.doctor_final as Draft | null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Interpretation review</h1>
      <DisclaimerBanner prominent />

      <div className="space-y-2">
        <h2 className="font-medium">AI draft (as generated)</h2>
        <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-slate-50">
          {draft.narrative}
        </p>
      </div>

      {isSignedOff ? (
        <div className="space-y-2">
          <h2 className="font-medium">Doctor-signed final</h2>
          <p className="text-sm whitespace-pre-wrap border-2 border-green-600 rounded-md p-3 bg-green-50">
            {finalData?.narrative}
          </p>
          <p className="text-xs text-slate-500">
            Signed off by Dr. {signedOffDoctor?.full_name ?? "unknown"} on{" "}
            {interpretation.signed_off_at
              ? new Date(interpretation.signed_off_at).toLocaleString()
              : ""}
          </p>
        </div>
      ) : (
        <ReviewForm
          interpretationId={id}
          narrative={draft.narrative}
          labResults={draft.lab_results ?? []}
        />
      )}
    </div>
  );
}

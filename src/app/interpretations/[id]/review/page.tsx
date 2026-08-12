import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";
import { logAuditEvent } from "@/lib/audit";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { ReviewForm } from "./ReviewForm";
import { PrintButton } from "./PrintButton";
import type {
  LabDraft,
  EcgDraft,
  ImagingDraft,
  PrescriptionsDraft,
  DermatologyDraft,
} from "@/lib/interpretation-modules";

type ModuleType = "lab" | "ecg" | "imaging" | "prescription" | "dermatology";
type AnyDraft = LabDraft | EcgDraft | ImagingDraft | PrescriptionsDraft | DermatologyDraft;

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
      "id, status, ai_draft, doctor_final, signed_off_at, report_id, reports(case_id, module_type, cases(patients(full_name), intake_records(age_at_visit, sex))), signed_off_by, doctors!interpretations_signed_off_by_fkey(full_name)"
    )
    .eq("id", id)
    .single();

  if (!interpretation) notFound();

  const report = Array.isArray(interpretation.reports)
    ? interpretation.reports[0]
    : interpretation.reports;
  const moduleType = (report?.module_type ?? "lab") as ModuleType;

  const caseRow = report ? (Array.isArray(report.cases) ? report.cases[0] : report.cases) : null;
  const patient = caseRow
    ? Array.isArray(caseRow.patients)
      ? caseRow.patients[0]
      : caseRow.patients
    : null;
  const intake = caseRow
    ? Array.isArray(caseRow.intake_records)
      ? caseRow.intake_records[0]
      : caseRow.intake_records
    : null;

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

  const draft = interpretation.ai_draft as AnyDraft;
  const signedOffDoctor = Array.isArray(interpretation.doctors)
    ? interpretation.doctors[0]
    : interpretation.doctors;
  const isSignedOff = interpretation.status === "signed_off";
  const finalData = interpretation.doctor_final as typeof draft | null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="border-b-2 border-brand-700 pb-3 space-y-0.5">
          <p className="font-semibold text-brand-800">
            {doctor.clinic_name || "NidanaSetu"}
          </p>
          {doctor.speciality && <p className="text-sm text-slate-600">{doctor.speciality}</p>}
          {doctor.address && <p className="text-sm text-slate-600">{doctor.address}</p>}
          <p className="text-sm text-slate-600">
            Dr. {doctor.full_name}
            {doctor.phone ? ` · ${doctor.phone}` : ""}
          </p>
          <p className="text-sm text-slate-700 pt-1">
            Patient: {patient?.full_name ?? "Unknown"}
            {intake?.age_at_visit != null ? ` · Age ${intake.age_at_visit}` : ""}
            {intake?.sex ? ` · ${intake.sex}` : ""}
          </p>
        </div>
        <PrintButton />
      </div>

      <h1 className="text-xl font-semibold capitalize">{moduleType} interpretation review</h1>
      <DisclaimerBanner prominent moduleType={moduleType} />

      <div className="space-y-2">
        <h2 className="font-medium">AI draft (as generated)</h2>
        <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-slate-50">
          {draft.narrative}
        </p>
        <StructuredDraft moduleType={moduleType} draft={draft} />
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
        <div className="print:hidden">
          <ReviewForm interpretationId={id} draft={draft} />
        </div>
      )}
    </div>
  );
}

function StructuredDraft({
  moduleType,
  draft,
}: {
  moduleType: ModuleType;
  draft: AnyDraft;
}) {
  if (moduleType === "lab") {
    const d = draft as LabDraft;
    if (!d.lab_results?.length) return null;
    return (
      <table className="w-full text-sm border">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="text-left p-2">Test</th>
            <th className="text-left p-2">Value</th>
            <th className="text-left p-2">Flag</th>
          </tr>
        </thead>
        <tbody>
          {d.lab_results.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{r.test_name}</td>
              <td className="p-2">
                {r.value} {r.unit ?? ""}
              </td>
              <td className={`p-2 ${r.flag === "normal" ? "text-slate-600" : "text-red-600 font-medium"}`}>
                {r.flag}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (moduleType === "ecg") {
    const d = draft as EcgDraft;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border rounded-md p-3">
        <div>
          <div className="text-slate-500">Rate</div>
          <div>{d.rate_bpm != null ? `${d.rate_bpm} bpm` : "—"}</div>
        </div>
        <div>
          <div className="text-slate-500">Rhythm</div>
          <div>{d.rhythm || "—"}</div>
        </div>
        <div>
          <div className="text-slate-500">Axis</div>
          <div>{d.axis || "—"}</div>
        </div>
        <div>
          <div className="text-slate-500">Intervals (ms)</div>
          <div>
            PR {d.intervals?.pr_ms ?? "—"} · QRS {d.intervals?.qrs_ms ?? "—"} · QT{" "}
            {d.intervals?.qt_ms ?? "—"} · QTc {d.intervals?.qtc_ms ?? "—"}
          </div>
        </div>
        {d.abnormalities?.length > 0 && (
          <div className="col-span-full">
            <div className="text-slate-500">Flagged abnormalities</div>
            <ul className="list-disc pl-5">
              {d.abnormalities.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (moduleType === "imaging") {
    const d = draft as ImagingDraft;
    if (!d.observations?.length) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-red-700 font-semibold">
          Observations to verify — not diagnostic conclusions
        </p>
        <ul className="border rounded-md divide-y">
          {d.observations.map((o, i) => (
            <li key={i} className="p-2 text-sm">
              {o.finding}
              {o.location ? <span className="text-slate-500"> ({o.location})</span> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (moduleType === "dermatology") {
    const d = draft as DermatologyDraft;
    const riskStyles: Record<DermatologyDraft["risk_impression"], string> = {
      likely_benign: "border-green-600 bg-green-50 text-green-900",
      indeterminate: "border-amber-500 bg-amber-50 text-amber-900",
      suspicious_features_present: "border-red-700 bg-red-100 text-red-950",
    };
    const riskLabels: Record<DermatologyDraft["risk_impression"], string> = {
      likely_benign: "Likely benign",
      indeterminate: "Indeterminate",
      suspicious_features_present: "Suspicious features present",
    };

    return (
      <div className="space-y-4">
        <div
          className={`border-2 rounded-md p-3 space-y-2 ${riskStyles[d.risk_impression]}`}
        >
          <p className="font-semibold text-sm uppercase tracking-wide">
            Risk impression: {riskLabels[d.risk_impression]}
          </p>
          {d.suspicious_features?.length > 0 && (
            <div>
              <p className="text-xs font-medium">Features noted:</p>
              <ul className="list-disc pl-5 text-sm">
                {d.suspicious_features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm">
            <span className="font-medium">Recommendation: </span>
            {d.recommendation}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm border rounded-md p-3">
          <div>
            <div className="text-slate-500">Type</div>
            <div>{d.lesion_description?.type || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Color</div>
            <div>{d.lesion_description?.color || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Border</div>
            <div>{d.lesion_description?.border || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Size (est.)</div>
            <div>{d.lesion_description?.size_estimate || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Texture</div>
            <div>{d.lesion_description?.texture || "—"}</div>
          </div>
        </div>
      </div>
    );
  }

  // prescription
  const d = draft as PrescriptionsDraft;
  return (
    <div className="space-y-4">
      {d.medications?.length > 0 && (
        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-2">Drug</th>
              <th className="text-left p-2">Dose</th>
              <th className="text-left p-2">Indications</th>
              <th className="text-left p-2">Side effects</th>
              <th className="text-left p-2">Interaction flags</th>
            </tr>
          </thead>
          <tbody>
            {d.medications.map((m, i) => (
              <tr key={i} className="border-b align-top">
                <td className="p-2">
                  {m.drug_name}
                  {m.normalized_name && m.normalized_name !== m.drug_name ? (
                    <div className="text-xs text-slate-500">({m.normalized_name})</div>
                  ) : null}
                </td>
                <td className="p-2">{m.dose ?? "—"}</td>
                <td className="p-2">{m.indications}</td>
                <td className="p-2">{m.side_effects}</td>
                <td className="p-2">
                  {m.interaction_flags?.length > 0 ? (
                    <ul className="list-disc pl-4 text-red-600">
                      {m.interaction_flags.map((f, j) => (
                        <li key={j}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    "none"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div>
        <h3 className="font-medium text-sm mb-1">
          Symptom vs. side-effect cross-check
        </h3>
        {d.symptom_cross_check?.length > 0 ? (
          <ul className="border rounded-md divide-y">
            {d.symptom_cross_check.map((c, i) => (
              <li key={i} className="p-2 text-sm">
                <strong>{c.symptom}</strong> may be related to{" "}
                <strong>{c.possibly_related_drug}</strong> — {c.rationale}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            No intake symptoms plausibly linked to current medication side effects.
          </p>
        )}
      </div>
    </div>
  );
}

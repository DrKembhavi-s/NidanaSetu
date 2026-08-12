import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerateButton } from "./GenerateButton";

export default async function ReportDetailPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id, case_id, module_type, modality, file_path, uploaded_at, cases(patient_id, patients(full_name))"
    )
    .eq("id", id)
    .single();

  if (!report) notFound();

  const caseRow = Array.isArray(report.cases) ? report.cases[0] : report.cases;
  const patient = caseRow
    ? Array.isArray(caseRow.patients)
      ? caseRow.patients[0]
      : caseRow.patients
    : null;

  const { data: intake } = await supabase
    .from("intake_records")
    .select("completed")
    .eq("case_id", report.case_id)
    .maybeSingle();

  const { data: interpretation } = await supabase
    .from("interpretations")
    .select("id, status, ai_draft")
    .eq("report_id", id)
    .maybeSingle();

  const { data: fileUrl } = await supabase.storage
    .from("report-files")
    .createSignedUrl(report.file_path, 600);

  const isLab = report.module_type === "lab";

  const { data: currentResults } = isLab
    ? await supabase.from("lab_results").select("test_name, value, unit, flag").eq("report_id", id)
    : { data: null };

  // Trend: previous lab reports for the same patient, most recent first.
  let trend: { test_name: string; value: string; uploaded_at: string }[] = [];
  if (isLab && caseRow?.patient_id) {
    const { data: priorReports } = await supabase
      .from("reports")
      .select("id, uploaded_at, case_id, cases(patient_id)")
      .eq("module_type", "lab")
      .neq("id", id)
      .order("uploaded_at", { ascending: false })
      .limit(20);

    const sameePatientReportIds =
      priorReports
        ?.filter((r) => {
          const c = Array.isArray(r.cases) ? r.cases[0] : r.cases;
          return c?.patient_id === caseRow.patient_id;
        })
        .map((r) => ({ id: r.id, uploaded_at: r.uploaded_at })) ?? [];

    if (sameePatientReportIds.length > 0) {
      const { data: priorResults } = await supabase
        .from("lab_results")
        .select("test_name, value, report_id")
        .in(
          "report_id",
          sameePatientReportIds.map((r) => r.id)
        );

      trend = (priorResults ?? []).map((r) => ({
        test_name: r.test_name,
        value: r.value,
        uploaded_at:
          sameePatientReportIds.find((p) => p.id === r.report_id)?.uploaded_at ?? "",
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold capitalize">
          {report.module_type}
          {report.modality ? ` (${report.modality.toUpperCase()})` : ""} —{" "}
          {patient?.full_name ?? "Unknown patient"}
        </h1>
        <p className="text-sm text-slate-600">
          Uploaded {new Date(report.uploaded_at).toLocaleString()}
        </p>
        {fileUrl?.signedUrl && (
          <a
            href={fileUrl.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand-700 underline"
          >
            View uploaded file
          </a>
        )}
      </div>

      {currentResults && currentResults.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium">Extracted values</h2>
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-2">Test</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2">Flag</th>
              </tr>
            </thead>
            <tbody>
              {currentResults.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{r.test_name}</td>
                  <td className="p-2">
                    {r.value} {r.unit ?? ""}
                  </td>
                  <td
                    className={`p-2 ${
                      r.flag === "normal" ? "text-slate-600" : "text-red-600 font-medium"
                    }`}
                  >
                    {r.flag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trend.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium">Trend (previous reports)</h2>
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-2">Test</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{r.test_name}</td>
                  <td className="p-2">{r.value}</td>
                  <td className="p-2">{new Date(r.uploaded_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {interpretation ? (
        <Link
          href={`/interpretations/${interpretation.id}/review`}
          className="inline-block bg-brand-700 hover:bg-brand-800 text-white rounded-md px-4 py-2"
        >
          {interpretation.status === "signed_off"
            ? "View signed-off interpretation"
            : "Review draft interpretation"}
        </Link>
      ) : (
        <GenerateButton reportId={id} intakeCompleted={Boolean(intake?.completed)} />
      )}
    </div>
  );
}

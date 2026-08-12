import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntakeForm } from "./IntakeForm";

const MODULES = [
  { key: "lab", label: "Lab reports", ready: true },
  { key: "ecg", label: "ECG", ready: false },
  { key: "imaging", label: "Imaging", ready: false },
  { key: "prescriptions", label: "Prescriptions", ready: false },
] as const;

export default async function CaseDetailPage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, status, patients(id, full_name, dob, sex)")
    .eq("id", id)
    .single();

  if (!caseRow) notFound();
  const patient = Array.isArray(caseRow.patients) ? caseRow.patients[0] : caseRow.patients;

  const { data: intake } = await supabase
    .from("intake_records")
    .select("age_at_visit, sex, weight_kg, symptoms, history, completed")
    .eq("case_id", id)
    .maybeSingle();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, module_type, uploaded_at, interpretations(id, status)")
    .eq("case_id", id)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{patient?.full_name}</h1>
        <p className="text-sm text-slate-600">
          {patient?.sex ?? "sex unknown"} · DOB {patient?.dob ?? "unknown"}
        </p>
      </div>

      <IntakeForm caseId={id} intake={intake ?? null} />

      <div className="space-y-3">
        <h2 className="font-medium">Reports</h2>
        <div className="flex gap-2 flex-wrap">
          {MODULES.map((m) =>
            m.ready ? (
              <Link
                key={m.key}
                href={`/cases/${id}/reports/lab/upload`}
                className="text-sm border rounded-md px-3 py-2"
              >
                Upload {m.label}
              </Link>
            ) : (
              <Link
                key={m.key}
                href={`/cases/${id}/reports/${m.key}`}
                className="text-sm border rounded-md px-3 py-2 text-slate-400"
              >
                {m.label} (coming soon)
              </Link>
            )
          )}
        </div>

        {!reports || reports.length === 0 ? (
          <p className="text-sm text-slate-600">No reports uploaded yet.</p>
        ) : (
          <ul className="divide-y border rounded-md">
            {reports.map((r) => {
              const interp = Array.isArray(r.interpretations)
                ? r.interpretations[0]
                : r.interpretations;
              return (
                <li key={r.id}>
                  <Link
                    href={`/reports/${r.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="uppercase text-sm">{r.module_type}</span>
                    <span className="text-xs text-slate-500">
                      {interp ? interp.status : "no interpretation yet"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

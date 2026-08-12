import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewCaseForm } from "./NewCaseForm";

export default async function NewCasePage({
  searchParams,
}: PageProps<"/cases/new">) {
  const params = await searchParams;
  const patientId =
    typeof params.patient_id === "string" ? params.patient_id : undefined;

  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name")
    .order("full_name");

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">New case</h1>
      {!patients || patients.length === 0 ? (
        <p className="text-sm text-slate-600">
          No patients yet.{" "}
          <Link href="/patients/new" className="text-brand-700 underline">
            Create a patient first
          </Link>
          .
        </p>
      ) : (
        <NewCaseForm patients={patients} defaultPatientId={patientId} />
      )}
    </div>
  );
}

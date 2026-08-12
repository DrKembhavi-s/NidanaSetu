"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";

export type CaseFormState = { error?: string };

export async function createCase(
  _prevState: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  const doctor = await getCurrentDoctor();
  if (!doctor) return { error: "Not signed in." };

  const patientId = String(formData.get("patient_id") ?? "").trim();
  if (!patientId) return { error: "Select a patient." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .insert({ patient_id: patientId, doctor_id: doctor.id })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create case." };

  redirect(`/cases/${data.id}`);
}

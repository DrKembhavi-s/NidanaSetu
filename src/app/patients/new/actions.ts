"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";

export type PatientFormState = { error?: string };

export async function createPatient(
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const doctor = await getCurrentDoctor();
  if (!doctor) return { error: "Not signed in." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const dob = String(formData.get("dob") ?? "").trim();
  const sex = String(formData.get("sex") ?? "").trim();

  if (!fullName) return { error: "Patient name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      full_name: fullName,
      dob: dob || null,
      sex: sex || null,
      created_by: doctor.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create patient." };

  redirect(`/cases/new?patient_id=${data.id}`);
}

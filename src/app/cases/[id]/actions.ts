"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type IntakeFormState = { error?: string };

export async function saveIntake(
  caseId: string,
  _prevState: IntakeFormState,
  formData: FormData
): Promise<IntakeFormState> {
  const ageRaw = String(formData.get("age_at_visit") ?? "").trim();
  const sex = String(formData.get("sex") ?? "").trim();
  const weightRaw = String(formData.get("weight_kg") ?? "").trim();
  const symptoms = String(formData.get("symptoms") ?? "").trim();
  const history = String(formData.get("history") ?? "").trim();

  const age = ageRaw ? Number(ageRaw) : null;
  const weight = weightRaw ? Number(weightRaw) : null;

  // Intake is considered "complete" the moment the mandatory fields (age,
  // sex, symptoms) are all present — that's what unlocks interpretation
  // generation for this case, per the intake-gate product rule.
  const completed = Boolean(age && sex && symptoms);

  const supabase = await createClient();
  const { error } = await supabase.from("intake_records").upsert(
    {
      case_id: caseId,
      age_at_visit: age,
      sex: sex || null,
      weight_kg: weight,
      symptoms: symptoms || null,
      history: history || null,
      completed,
    },
    { onConflict: "case_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/cases/${caseId}`);
  return {};
}

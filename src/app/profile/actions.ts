"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";

export type ProfileFormState = { error?: string; success?: boolean };

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const doctor = await getCurrentDoctor();
  if (!doctor) return { error: "Not signed in." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const clinicName = String(formData.get("clinic_name") ?? "").trim();
  const speciality = String(formData.get("speciality") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { error: "Full name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("doctors")
    .update({
      full_name: fullName,
      clinic_name: clinicName || null,
      speciality: speciality || null,
      address: address || null,
      phone: phone || null,
    })
    .eq("id", doctor.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { success: true };
}

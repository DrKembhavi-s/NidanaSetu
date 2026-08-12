"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthFormState } from "@/app/login/actions";

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const clinicName = String(formData.get("clinic_name") ?? "").trim();
  const speciality = String(formData.get("speciality") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "Name, email, and password are required." };
  }

  const admin = createAdminClient();

  // This is a single-tenant internal tool for doctors, not public signup —
  // auto-confirm the email via the admin API so a doctor can sign in right
  // away without needing access to a real inbox to click a confirmation link.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create account." };
  }

  const { error: doctorError } = await admin.from("doctors").insert({
    auth_user_id: created.user.id,
    full_name: fullName,
    email,
    clinic_name: clinicName || null,
    speciality: speciality || null,
    address: address || null,
    phone: phone || null,
  });
  if (doctorError) {
    return { error: doctorError.message };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { error: signInError.message };

  redirect("/");
}

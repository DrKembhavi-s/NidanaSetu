import { createClient } from "@/lib/supabase/server";

export type Doctor = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export async function getCurrentDoctor(): Promise<Doctor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: doctor } = await supabase
    .from("doctors")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return (doctor as Doctor) ?? null;
}

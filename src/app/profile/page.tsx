import { redirect } from "next/navigation";
import { getCurrentDoctor } from "@/lib/doctor";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Your profile</h1>
      <p className="text-sm text-slate-600">
        Clinic details you enter here appear on your printed/downloaded interpretations.
      </p>
      <ProfileForm doctor={doctor} />
    </div>
  );
}

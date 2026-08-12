import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";

export default async function DashboardPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select("id, status, created_at, patients(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your cases</h1>
        <div className="flex gap-3">
          <Link
            href="/patients/new"
            className="text-sm border border-brand-700 text-brand-700 rounded-md px-3 py-2 hover:bg-brand-50"
          >
            New patient
          </Link>
          <Link
            href="/cases/new"
            className="text-sm bg-brand-700 hover:bg-brand-800 text-white rounded-md px-3 py-2"
          >
            New case
          </Link>
        </div>
      </div>

      {!cases || cases.length === 0 ? (
        <p className="text-sm text-slate-600">
          No cases yet. Create a patient, then a case, to get started.
        </p>
      ) : (
        <ul className="divide-y border rounded-md">
          {cases.map((c) => {
            const patient = Array.isArray(c.patients) ? c.patients[0] : c.patients;
            return (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span>{patient?.full_name ?? "Unknown patient"}</span>
                  <span className="text-xs text-slate-500 uppercase">
                    {c.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

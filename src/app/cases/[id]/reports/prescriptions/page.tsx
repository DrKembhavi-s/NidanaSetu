import Link from "next/link";

export default async function PrescriptionsStubPage({
  params,
}: PageProps<"/cases/[id]/reports/prescriptions">) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Prescriptions module</h1>
      <p className="text-sm text-slate-600">
        Coming soon. This will normalize drug names/doses against a
        formulary, surface indications and side effects, flag
        interactions/duplications, and cross-check current-medication side
        effects against the patient&apos;s intake symptoms.
      </p>
      <Link href={`/cases/${id}`} className="text-sm underline">
        Back to case
      </Link>
    </div>
  );
}

import Link from "next/link";

export default async function EcgStubPage({ params }: PageProps<"/cases/[id]/reports/ecg">) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ECG module</h1>
      <p className="text-sm text-slate-600">
        Coming soon. Phase 0 covers the lab reports module only — ECG image
        reads (rate, rhythm, axis, interval cues) are planned for the next
        phase.
      </p>
      <Link href={`/cases/${id}`} className="text-sm underline">
        Back to case
      </Link>
    </div>
  );
}

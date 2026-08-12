import Link from "next/link";

export default async function ImagingStubPage({
  params,
}: PageProps<"/cases/[id]/reports/imaging">) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Imaging module</h1>
      <p className="text-sm text-slate-600">
        Coming soon. X-ray/USG/MRI/CT image reads are planned for the next
        phase — this will be the highest-liability module, with the most
        prominent disclaimer and findings framed as &quot;observations to
        verify,&quot; not conclusions.
      </p>
      <Link href={`/cases/${id}`} className="text-sm underline">
        Back to case
      </Link>
    </div>
  );
}

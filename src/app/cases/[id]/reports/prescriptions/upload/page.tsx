import { UploadForm } from "@/components/UploadForm";

export default async function UploadPrescriptionPage({
  params,
}: PageProps<"/cases/[id]/reports/prescriptions/upload">) {
  const { id } = await params;
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Upload prescription</h1>
      <UploadForm caseId={id} moduleType="prescription" />
    </div>
  );
}

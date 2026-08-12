import { UploadForm } from "@/components/UploadForm";

export default async function UploadEcgReportPage({
  params,
}: PageProps<"/cases/[id]/reports/ecg/upload">) {
  const { id } = await params;
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Upload ECG</h1>
      <UploadForm caseId={id} moduleType="ecg" />
    </div>
  );
}

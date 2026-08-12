import { UploadForm } from "@/components/UploadForm";

export default async function UploadDermatologyReportPage({
  params,
}: PageProps<"/cases/[id]/reports/dermatology/upload">) {
  const { id } = await params;
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Upload skin lesion photo</h1>
      <UploadForm caseId={id} moduleType="dermatology" />
    </div>
  );
}

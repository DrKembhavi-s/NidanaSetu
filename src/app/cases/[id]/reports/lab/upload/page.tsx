import { UploadForm } from "@/components/UploadForm";

export default async function UploadLabReportPage({
  params,
}: PageProps<"/cases/[id]/reports/lab/upload">) {
  const { id } = await params;
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Upload lab report</h1>
      <UploadForm caseId={id} moduleType="lab" />
    </div>
  );
}

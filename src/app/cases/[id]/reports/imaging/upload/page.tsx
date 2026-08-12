import { UploadForm } from "@/components/UploadForm";

export default async function UploadImagingReportPage({
  params,
}: PageProps<"/cases/[id]/reports/imaging/upload">) {
  const { id } = await params;
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Upload imaging study</h1>
      <UploadForm caseId={id} moduleType="imaging" showModality />
    </div>
  );
}

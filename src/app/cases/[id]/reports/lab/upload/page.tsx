"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function UploadLabReportPage({
  params,
}: PageProps<"/cases/[id]/reports/lab/upload">) {
  const { id: caseId } = use(params);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("case_id", caseId);
    formData.set("file", file);

    const res = await fetch("/api/reports/lab", { method: "POST", body: formData });
    const body = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(body.error ?? "Upload failed.");
      return;
    }

    router.push(`/reports/${body.report_id}`);
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Upload lab report</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MODALITIES = [
  { value: "xray", label: "X-ray" },
  { value: "usg", label: "Ultrasound (USG)" },
  { value: "mri", label: "MRI" },
  { value: "ct", label: "CT" },
];

export function UploadForm({
  caseId,
  moduleType,
  showModality = false,
}: {
  caseId: string;
  moduleType: "lab" | "ecg" | "imaging" | "prescription";
  showModality?: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [modality, setModality] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (showModality && !modality) {
      setError("Select a modality first.");
      return;
    }
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("case_id", caseId);
    formData.set("module_type", moduleType);
    formData.set("file", file);
    if (showModality) formData.set("modality", modality);

    const res = await fetch("/api/reports/upload", { method: "POST", body: formData });
    const body = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(body.error ?? "Upload failed.");
      return;
    }

    router.push(`/reports/${body.report_id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showModality && (
        <div>
          <label className="block text-sm mb-1" htmlFor="modality">
            Modality
          </label>
          <select
            id="modality"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="" disabled>
              Select...
            </option>
            {MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}
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
        className="bg-brand-700 hover:bg-brand-800 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}

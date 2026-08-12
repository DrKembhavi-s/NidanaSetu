"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateButton({
  reportId,
  intakeCompleted,
}: {
  reportId: string;
  intakeCompleted: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const res = await fetch("/api/interpretations/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: reportId }),
    });
    const body = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(body.message ?? body.error ?? "Could not generate interpretation.");
      return;
    }

    router.push(`/interpretations/${body.interpretation_id}/review`);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!intakeCompleted || pending}
        className="bg-brand-700 hover:bg-brand-800 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Generating..." : "Generate interpretation"}
      </button>
      {!intakeCompleted && (
        <p className="text-sm text-amber-700">
          Complete the patient intake before generating an interpretation.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

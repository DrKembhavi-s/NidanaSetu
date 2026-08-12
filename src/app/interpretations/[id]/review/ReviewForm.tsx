"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LabResult = {
  test_name: string;
  value: string;
  unit?: string;
  flag: string;
};

export function ReviewForm({
  interpretationId,
  narrative,
  labResults,
}: {
  interpretationId: string;
  narrative: string;
  labResults: LabResult[];
}) {
  const router = useRouter();
  const [text, setText] = useState(narrative);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOff() {
    setPending(true);
    setError(null);

    const res = await fetch(`/api/interpretations/${interpretationId}/sign-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_final: { narrative: text, lab_results: labResults },
      }),
    });
    const body = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(body.error ?? "Could not sign off.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1" htmlFor="final_narrative">
          Doctor-edited final narrative
        </label>
        <textarea
          id="final_narrative"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSignOff}
        disabled={pending}
        className="bg-green-700 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Signing off..." : "Sign off as final"}
      </button>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { createCase, type CaseFormState } from "./actions";

const initialState: CaseFormState = {};

export function NewCaseForm({
  patients,
  defaultPatientId,
}: {
  patients: { id: string; full_name: string }[];
  defaultPatientId?: string;
}) {
  const [state, formAction, pending] = useActionState(createCase, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm mb-1" htmlFor="patient_id">
          Patient
        </label>
        <select
          id="patient_id"
          name="patient_id"
          required
          defaultValue={defaultPatientId ?? ""}
          className="w-full border rounded-md px-3 py-2"
        >
          <option value="" disabled>
            Select a patient...
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-brand-700 hover:bg-brand-800 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create case"}
      </button>
    </form>
  );
}

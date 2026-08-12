"use client";

import { useActionState } from "react";
import { saveIntake, type IntakeFormState } from "./actions";

const initialState: IntakeFormState = {};

type Intake = {
  age_at_visit: number | null;
  sex: string | null;
  weight_kg: number | null;
  symptoms: string | null;
  history: string | null;
  completed: boolean;
} | null;

export function IntakeForm({ caseId, intake }: { caseId: string; intake: Intake }) {
  const boundAction = saveIntake.bind(null, caseId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Intake</h2>
        <span
          className={`text-xs uppercase px-2 py-1 rounded ${
            intake?.completed
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {intake?.completed ? "Complete" : "Incomplete"}
        </span>
      </div>
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1" htmlFor="age_at_visit">
              Age
            </label>
            <input
              id="age_at_visit"
              name="age_at_visit"
              type="number"
              min={0}
              defaultValue={intake?.age_at_visit ?? ""}
              required
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="sex">
              Sex
            </label>
            <select
              id="sex"
              name="sex"
              defaultValue={intake?.sex ?? ""}
              required
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="" disabled>
                Select...
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="weight_kg">
            Weight (kg, optional)
          </label>
          <input
            id="weight_kg"
            name="weight_kg"
            type="number"
            step="0.1"
            min={0}
            defaultValue={intake?.weight_kg ?? ""}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="symptoms">
            Presenting symptoms
          </label>
          <textarea
            id="symptoms"
            name="symptoms"
            required
            defaultValue={intake?.symptoms ?? ""}
            rows={3}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="history">
            Relevant history
          </label>
          <textarea
            id="history"
            name="history"
            defaultValue={intake?.history ?? ""}
            rows={3}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save intake"}
        </button>
      </form>
    </div>
  );
}

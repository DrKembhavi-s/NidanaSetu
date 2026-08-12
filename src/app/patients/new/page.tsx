"use client";

import { useActionState } from "react";
import { createPatient, type PatientFormState } from "./actions";

const initialState: PatientFormState = {};

export default function NewPatientPage() {
  const [state, formAction, pending] = useActionState(createPatient, initialState);

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">New patient</h1>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="full_name">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="dob">
            Date of birth
          </label>
          <input
            id="dob"
            name="dob"
            type="date"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="sex">
            Sex
          </label>
          <select id="sex" name="sex" className="w-full border rounded-md px-3 py-2">
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Create patient"}
        </button>
      </form>
    </div>
  );
}

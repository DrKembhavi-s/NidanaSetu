"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import type { Doctor } from "@/lib/doctor";

const initialState: ProfileFormState = {};

const inputClass =
  "w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400";

export function ProfileForm({ doctor }: { doctor: Doctor }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4 bg-white border rounded-lg shadow-sm p-6">
      <div>
        <label className="block text-sm mb-1" htmlFor="full_name">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={doctor.full_name}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input value={doctor.email} disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="clinic_name">
          Clinic name
        </label>
        <input
          id="clinic_name"
          name="clinic_name"
          type="text"
          defaultValue={doctor.clinic_name ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="speciality">
          Speciality
        </label>
        <input
          id="speciality"
          name="speciality"
          type="text"
          defaultValue={doctor.speciality ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="address">
          Clinic address
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={doctor.address ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="phone">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={doctor.phone ?? ""}
          className={inputClass}
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-brand-700 hover:bg-brand-800 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

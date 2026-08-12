"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";
import type { AuthFormState } from "@/app/login/actions";

const initialState: AuthFormState = {};

const inputClass =
  "w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-brand-700 tracking-wide">NidanaSetu</h1>
        <p className="text-sm text-slate-500">AI-assisted diagnostic interpretation for doctors</p>
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-center">Doctor sign up</h2>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="full_name">
              Full name
            </label>
            <input id="full_name" name="full_name" type="text" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className={inputClass}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Clinic details (optional, shown on your reports)
            </p>
            <div>
              <label className="block text-sm mb-1" htmlFor="clinic_name">
                Clinic name
              </label>
              <input id="clinic_name" name="clinic_name" type="text" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="speciality">
                Speciality
              </label>
              <input id="speciality" name="speciality" type="text" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="address">
                Clinic address
              </label>
              <textarea id="address" name="address" rows={2} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="phone">
                Phone
              </label>
              <input id="phone" name="phone" type="tel" className={inputClass} />
            </div>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white rounded-md py-2 disabled:opacity-50"
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="text-sm text-slate-600 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-700 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

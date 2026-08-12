"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="max-w-sm mx-auto mt-16 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-brand-700 tracking-wide">NidanaSetu</h1>
        <p className="text-sm text-slate-500">AI-assisted diagnostic interpretation for doctors</p>
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-center">Doctor login</h2>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
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
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white rounded-md py-2 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-sm text-slate-600 text-center">
          No account?{" "}
          <Link href="/signup" className="text-brand-700 underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

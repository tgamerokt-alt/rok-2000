"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, ActionState } from "@/lib/actions";
import { Dictionary } from "@/lib/i18n/dictionaries";

const initialState: ActionState = {};

export default function LoginForm({ t }: { t: Dictionary }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/30"
    >
      <h1 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{t.login.title}</h1>
      <input type="hidden" name="next" value={next} />

      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{t.login.email}</label>
      <input
        type="email"
        name="email"
        required
        className="mb-3 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />

      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{t.login.password}</label>
      <input
        type="password"
        name="password"
        required
        className="mb-4 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />

      {state.error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}

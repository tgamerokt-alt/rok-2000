"use client";

import { useState } from "react";
import Link from "next/link";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";

export function KingdomGrid({
  kingdoms,
  t,
  searchable = false,
}: {
  kingdoms: { id: string; menuCount: number }[];
  t: Dictionary;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const shown = q ? kingdoms.filter((k) => k.id.includes(q)) : kingdoms;

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder={t.kingdomsIndex.searchPlaceholder}
          className="w-full max-w-xs rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.kingdomsIndex.noMatch}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {shown.map((k) => (
            <Link
              key={k.id}
              href={`/kingdom/${k.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-lg shadow-slate-200/50 transition hover:border-amber-500 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/30 dark:hover:bg-slate-800"
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">{t.common.kingdom}</div>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{k.id}</div>
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {formatTemplate(t.home.kvkCount, { count: String(k.menuCount) })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

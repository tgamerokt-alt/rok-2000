"use client";

import { useEffect, useRef, useState } from "react";

export function ColumnToggle<K extends string>({
  label,
  selectAllLabel,
  columns,
  hidden,
  onToggle,
  onSetAll,
}: {
  label: string;
  selectAllLabel: string;
  columns: { key: K; label: string }[];
  hidden: Set<K>;
  onToggle: (key: K) => void;
  onSetAll: (hide: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const allVisible = hidden.size === 0;
  const noneVisible = hidden.size === columns.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = !allVisible && !noneVisible;
  }, [allVisible, noneVisible]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-80 w-56 overflow-y-auto rounded-md border border-slate-300 bg-white p-2 shadow-lg shadow-slate-300/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisible}
              onChange={() => onSetAll(allVisible)}
              className="accent-amber-500"
            />
            {selectAllLabel}
          </label>
          <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={!hidden.has(col.key)}
                onChange={() => onToggle(col.key)}
                className="accent-amber-500"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/** A text input with a styled suggestions dropdown (unlike native <datalist>,
 * which renders inconsistently/half-cut-off across browsers). Free typing is
 * still allowed — suggestions are a convenience, not a restriction. */
export function ComboBoxInput({
  name,
  required,
  placeholder,
  options,
  className = "",
}: {
  name: string;
  required?: boolean;
  placeholder?: string;
  options: string[];
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()));

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden field carries the actual submitted value. The visible field below has
       * no name/id, so browsers can't key their own autofill suggestions off it — that
       * autofill popup (unstylable, browser-native) was showing up instead of ours. */}
      <input type="hidden" name={name} value={value} />
      <input
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-300 bg-white py-1 shadow-xl shadow-slate-900/10 dark:border-slate-600 dark:bg-slate-800 dark:shadow-black/60">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setValue(option);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-amber-50 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

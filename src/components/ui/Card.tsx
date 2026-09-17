import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

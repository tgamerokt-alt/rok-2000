import Link from "next/link";

const Chevron = ({ className }: { className: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 20 20"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 5l5 5-5 5" />
  </svg>
);

/**
 * Governor name rendered as an obvious tap target.
 * "compact" = inline pill for tables; "touch" = full-width 2-line row (name + ID) for mobile cards.
 */
export default function PlayerLink({
  governorId,
  name,
  note,
  size = "compact",
}: {
  governorId: string;
  name: string;
  /** extra line under the name in "touch" mode (e.g. "formerly: …") */
  note?: string;
  size?: "compact" | "touch";
}) {
  const href = `/governor/${governorId}`;

  if (size === "touch") {
    return (
      <Link
        href={href}
        className="group flex min-h-11 w-full items-center gap-2.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-500/5 py-1.5 pl-1.5 pr-2.5 ring-1 ring-inset ring-amber-500/30 transition active:bg-amber-500/25 active:ring-amber-500/60"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold uppercase text-amber-700 dark:text-amber-300"
        >
          {Array.from(name.trim())[0] ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{name}</span>
          {note && <span className="block text-[11px] italic leading-tight text-slate-500">{note}</span>}
          <span className="block text-[9px] leading-tight text-slate-500 dark:text-slate-400">
            ID <span className="font-mono tabular-nums">{governorId}</span>
          </span>
        </span>
        <Chevron className="h-4 w-4 shrink-0 text-amber-600 transition group-active:translate-x-0.5 dark:text-amber-400" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group inline-flex max-w-full items-center gap-1 rounded-full bg-amber-500/10 py-1 pl-2.5 pr-1.5 text-[13px] font-medium leading-tight text-amber-700 ring-1 ring-inset ring-amber-500/25 transition hover:bg-amber-500/20 hover:ring-amber-500/50 active:scale-[0.98] dark:text-amber-300"
    >
      <span className="break-words">{name}</span>
      <Chevron className="h-4 w-4 shrink-0 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}

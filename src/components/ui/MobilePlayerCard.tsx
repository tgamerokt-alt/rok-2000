import Link from "next/link";
import { ReactNode } from "react";
import { RankBadge } from "@/components/ui/RankBadge";

interface Col<M> {
  key: string;
  label: string;
  cellClassName: (m: M) => string;
  render: (m: M) => string;
}

/** Stats worth seeing without expanding the card; everything else goes under "All stats". */
const PRIMARY_KEYS = ["power", "total_kill_points", "kp_t4t5", "dead_t4t5"];

/**
 * Mobile row for one governor. The whole header (rank · name · ID · DKP) is a single
 * ≥56px tap target to the governor page; key stats are always visible, the rest is a
 * native <details> so the list stays short and scannable.
 */
export default function MobilePlayerCard<M extends { governor_id: string; name: string }>({
  member,
  rank,
  showMedal,
  note,
  dkpLabel,
  dkp,
  columns,
  allStatsLabel,
}: {
  member: M;
  rank: number;
  showMedal: boolean;
  note?: string;
  dkpLabel: string;
  dkp: ReactNode;
  columns: Col<M>[];
  allStatsLabel: string;
}) {
  const stats = columns.filter((c) => c.key !== "dkp");
  const primary = stats.filter((c) => PRIMARY_KEYS.includes(c.key));
  const rest = stats.filter((c) => !PRIMARY_KEYS.includes(c.key));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link
        href={`/governor/${member.governor_id}`}
        className="group flex min-h-16 items-center gap-3 px-3.5 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-800/70"
      >
        <div className="flex w-8 shrink-0 justify-center text-base font-bold tabular-nums text-slate-400 dark:text-slate-500">
          <RankBadge rank={rank} showMedal={showMedal} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">{member.name}</div>
          {note && <div className="text-[11px] italic leading-tight text-slate-500">{note}</div>}
          <div className="mt-0.5 text-[11px] leading-tight text-slate-500">
            ID <span className="font-mono tabular-nums">{member.governor_id}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{dkpLabel}</div>
          <div className="text-base font-bold tabular-nums leading-tight text-amber-600 dark:text-amber-400">{dkp}</div>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-slate-400 transition group-active:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 5l5 5-5 5" />
        </svg>
      </Link>

      {primary.length > 0 && (
        <dl className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
          {primary.map((col, idx) => (
            <div
              key={col.key}
              className={`px-3.5 py-2.5 ${idx % 2 === 0 ? "border-r" : ""} ${idx > 1 ? "border-t" : ""} border-slate-100 dark:border-slate-800`}
            >
              <dt className="truncate text-[10px] uppercase tracking-wide text-slate-500">{col.label}</dt>
              <dd className={`text-sm font-semibold tabular-nums ${col.cellClassName(member)}`}>{col.render(member)}</dd>
            </div>
          ))}
        </dl>
      )}

      {rest.length > 0 && (
        <details className="group/more border-t border-slate-100 dark:border-slate-800">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-xs font-medium text-slate-500 select-none active:bg-slate-100 dark:active:bg-slate-800/70 [&::-webkit-details-marker]:hidden">
            {allStatsLabel}
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="h-4 w-4 transition-transform group-open/more:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 8l5 5 5-5" />
            </svg>
          </summary>
          <dl className="px-3.5 pb-2">
            {rest.map((col) => (
              <div key={col.key} className="flex items-center justify-between border-t border-slate-100 py-2 text-xs dark:border-slate-800">
                <dt className="text-slate-500">{col.label}</dt>
                <dd className={`font-semibold tabular-nums ${col.cellClassName(member)}`}>{col.render(member)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

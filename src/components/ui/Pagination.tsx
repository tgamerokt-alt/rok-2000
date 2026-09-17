import { formatTemplate } from "@/lib/i18n/dictionaries";

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const pages: (number | "…")[] = [1];
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pagination({
  page,
  pageCount,
  onChange,
  prevLabel,
  nextLabel,
  pageLabel,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  prevLabel: string;
  nextLabel: string;
  /** template with {page} and {total} placeholders — used as the nav's accessible label */
  pageLabel: string;
}) {
  if (pageCount <= 1) return null;

  const pages = getPageNumbers(page, pageCount);

  return (
    <nav
      aria-label={formatTemplate(pageLabel, { page: String(page), total: String(pageCount) })}
      className="flex items-center justify-center gap-1 border-t border-slate-200 px-3 py-3 dark:border-slate-800"
    >
      <button
        type="button"
        aria-label={prevLabel}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronIcon direction="left" />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-slate-500 dark:text-slate-600">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition ${
              p === page
                ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        aria-label={nextLabel}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronIcon direction="right" />
      </button>
    </nav>
  );
}

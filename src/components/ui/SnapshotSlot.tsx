export function SnapshotSlot({
  step,
  title,
  description,
  dateInputName,
  dateCaption,
  dateDisplay,
  fileName,
  fileRequired = true,
}: {
  step: number;
  title: string;
  /** short help text explaining which export goes here, for someone unfamiliar with the file */
  description?: string;
  /** editable date input — omit for a read-only slot (dates already fixed) */
  dateInputName?: string;
  /** small caption above the editable date input, e.g. "Start date" */
  dateCaption?: string;
  /** static date text shown instead of an input, e.g. when editing an existing menu */
  dateDisplay?: string;
  fileName: string;
  fileRequired?: boolean;
}) {
  return (
    <div className="flex-1 min-w-[220px] rounded-lg border border-slate-300 bg-slate-100 p-3 dark:border-slate-700/70 dark:bg-slate-950/60">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-slate-950">
          {step}
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</span>
        {dateDisplay && <span className="ml-auto text-[11px] text-slate-500">{dateDisplay}</span>}
      </div>
      {description && <p className="mb-2 text-[11px] leading-snug text-slate-500">{description}</p>}
      {dateInputName && (
        <>
          {dateCaption && <label className="mb-1 block text-[11px] text-slate-500">{dateCaption}</label>}
          <input
            type="date"
            name={dateInputName}
            required
            className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </>
      )}
      <input
        type="file"
        name={fileName}
        accept=".xlsx"
        required={fileRequired}
        className="w-full text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-slate-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
      />
    </div>
  );
}

export function SnapshotArrow() {
  return (
    <div className="hidden shrink-0 items-center justify-center text-slate-400 sm:flex dark:text-slate-600">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

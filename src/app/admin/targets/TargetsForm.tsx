"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionState, updateTargetsAction } from "@/lib/actions";
import { TargetBracket } from "@/lib/types";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { confirmAction, notifyResult } from "@/lib/confirm";

const initialState: ActionState = {};

/** Editable row — strings so a half-typed number doesn't snap back. Power is entered in millions. */
interface Row {
  id: number;
  minPowerM: string;
  kills: string;
  dead: string;
  dkp: string;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function toRows(brackets: TargetBracket[]): Row[] {
  return brackets.map((b, i) => ({
    id: i,
    minPowerM: String(b.minPower / 1e6),
    kills: String(b.kills),
    dead: String(b.dead),
    dkp: String(b.dkp),
  }));
}

export default function TargetsForm({
  kingdomId,
  kingdomIds,
  brackets,
  t,
}: {
  kingdomId: string;
  kingdomIds: string[];
  brackets: TargetBracket[];
  t: Dictionary;
}) {
  const tt = t.admin.targets;
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateTargetsAction, initialState);
  const [rows, setRows] = useState<Row[]>(() => toRows(brackets));
  const [nextId, setNextId] = useState(brackets.length);

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) notifyResult({ success: true, message: tt.saveSuccess });
  }, [state, tt]);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));
  const payload = JSON.stringify(
    rows.map((r) => ({ minPower: Math.round(num(r.minPowerM) * 1e6), kills: num(r.kills), dead: num(r.dead), dkp: num(r.dkp) }))
  );

  // Row order for the "applies to" hint: by starting power, like the server stores it.
  const sortedMins = rows.map((r) => num(r.minPowerM)).sort((a, b) => a - b);
  const rangeLabel = (r: Row) => {
    const min = num(r.minPowerM);
    const next = sortedMins.find((m) => m > min);
    return next === undefined
      ? formatTemplate(tt.rangeOpen, { min: String(min) })
      : formatTemplate(tt.rangeClosed, { min: String(min), max: String(next) });
  };

  function update(id: number, field: keyof Omit<Row, "id">, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value.replace(/[^\d.,]/g, "") } : r)));
  }

  function addRow() {
    const lastMin = sortedMins.length ? sortedMins[sortedMins.length - 1] : -20;
    setRows((prev) => [...prev, { id: nextId, minPowerM: String(lastMin + 20), kills: "", dead: "", dkp: "" }]);
    setNextId((n) => n + 1);
  }

  async function clearAll() {
    const confirmed = await confirmAction({
      title: tt.clearConfirmTitle,
      text: tt.clearConfirmText,
      confirmLabel: t.common.confirmDelete,
      cancelLabel: t.common.cancel,
    });
    if (confirmed) setRows([]);
  }

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-4xl">
        <PageHeader title={formatTemplate(tt.title, { id: kingdomId })} subtitle={tt.subtitle} />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t.admin.formula.kingdomPickerLabel}</span>
          <select
            value={kingdomId}
            onChange={(e) => router.push(`/admin/targets?kingdom=${e.target.value}`)}
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {kingdomIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <Card className="p-5">
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="kingdomId" value={kingdomId} />
            <input type="hidden" name="brackets" value={payload} />

            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tt.hint}</p>

            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {tt.empty}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-xs text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-2 py-1 text-left">{tt.minPower}</th>
                      <th className="px-2 py-1 text-right">{tt.kills}</th>
                      <th className="px-2 py-1 text-right">{tt.dead}</th>
                      <th className="px-2 py-1 text-right">{tt.dkp}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              value={r.minPowerM}
                              onChange={(e) => update(r.id, "minPowerM", e.target.value)}
                              inputMode="decimal"
                              className={`${inputClass} w-20`}
                            />
                            <span className="text-xs text-slate-500">M</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{rangeLabel(r)}</div>
                        </td>
                        {(["kills", "dead", "dkp"] as const).map((field) => (
                          <td key={field} className="px-2 py-1.5 align-top">
                            <input
                              value={r[field]}
                              onChange={(e) => update(r.id, field, e.target.value)}
                              inputMode="numeric"
                              placeholder="0"
                              className={inputClass}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 align-top">
                          <button
                            type="button"
                            onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                            aria-label={tt.removeRow}
                            title={tt.removeRow}
                            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:border-red-400 hover:text-red-600 dark:border-slate-700 dark:text-slate-400"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={addRow}
                className="rounded-md border border-amber-400 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                {tt.addRow}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {pending ? t.common.saving : tt.save}
              </button>
              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-auto rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {tt.clearAll}
                </button>
              )}
            </div>
          </form>
        </Card>
      </PageContainer>
    </main>
  );
}

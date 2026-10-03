"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionState, updateTargetsAction } from "@/lib/actions";
import { TargetBracket } from "@/lib/types";
import { TargetMetric } from "@/lib/targets";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { fmtCompact } from "@/components/charts/Charts";
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

const METRIC_ICON: Record<TargetMetric, string> = { kills: "⚔", dead: "💀", dkp: "🏆" };

// No width here — each input sets its own (a w-full here would override the power input's w-20).
const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white";

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

  // Power order (how the server stores and applies brackets) — for range labels.
  const sorted = [...rows].sort((a, b) => num(a.minPowerM) - num(b.minPowerM));
  const rangeLabel = (r: Row) => {
    const min = num(r.minPowerM);
    const next = sorted.map((x) => num(x.minPowerM)).find((m) => m > min);
    return next === undefined
      ? formatTemplate(tt.rangeOpen, { min: String(min) })
      : formatTemplate(tt.rangeClosed, { min: String(min), max: String(next) });
  };

  /** Plain-language rule for one bracket, e.g. "Kills ≥ 1M and Dead ≥ 100K". */
  const ruleText = (r: Row) => {
    const reqs = (["kills", "dead", "dkp"] as const)
      .filter((k) => num(r[k]) > 0)
      .map((k) => `${tt.metric[k].short} ≥ ${fmtCompact(num(r[k]))}`);
    return reqs.length === 0
      ? formatTemplate(tt.ruleExempt, { range: rangeLabel(r) })
      : formatTemplate(tt.ruleNeeds, { range: rangeLabel(r), reqs: reqs.join(tt.ruleAnd) });
  };

  function update(id: number, field: keyof Omit<Row, "id">, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value.replace(/[^\d.,]/g, "") } : r)));
  }

  function addRow() {
    const mins = rows.map((r) => num(r.minPowerM));
    const lastMin = mins.length ? Math.max(...mins) : -20;
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

        {/* What each requirement means, and how the overall result is decided */}
        <Card className="mb-4 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{tt.howTitle}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(["kills", "dead", "dkp"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  <span aria-hidden className="mr-1.5">{METRIC_ICON[k]}</span>
                  {tt.metric[k].title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tt.metric[k].desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="font-semibold">{tt.overallTitle}</span> {tt.overallDesc}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tt.hint}</p>
        </Card>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="kingdomId" value={kingdomId} />
          <input type="hidden" name="brackets" value={payload} />

          {rows.length === 0 ? (
            <Card className="border-dashed p-6 text-center text-sm text-slate-500 dark:text-slate-400">{tt.empty}</Card>
          ) : (
            // Input order, not power order — re-sorting while typing a power value would make cards jump.
            rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tt.minPower}</span>
                  <input
                    value={r.minPowerM}
                    onChange={(e) => update(r.id, "minPowerM", e.target.value)}
                    inputMode="decimal"
                    aria-label={tt.minPower}
                    className={`${inputClass} w-20`}
                  />
                  <span className="text-xs text-slate-500">M</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {rangeLabel(r)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                    aria-label={tt.removeRow}
                    title={tt.removeRow}
                    className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-red-400 hover:text-red-600 dark:border-slate-700 dark:text-slate-400"
                  >
                    ✕ {tt.removeRow}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(["kills", "dead", "dkp"] as const).map((k) => {
                    const v = num(r[k]);
                    return (
                      <label key={k} className="block rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <span aria-hidden className="mr-1">{METRIC_ICON[k]}</span>
                          {tt.metric[k].title}
                        </span>
                        <input
                          value={r[k]}
                          onChange={(e) => update(r.id, k, e.target.value)}
                          inputMode="numeric"
                          placeholder="0"
                          className={`${inputClass} w-full`}
                        />
                        <span className="mt-1 block text-right text-[11px] text-slate-500 dark:text-slate-400">
                          {v > 0 ? `= ${v.toLocaleString("en-US")} (${fmtCompact(v)})` : tt.notRequired}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                  <span aria-hidden className="mr-1">→</span>
                  {ruleText(r)}
                </p>
              </Card>
            ))
          )}

          <div className="flex flex-wrap gap-2 pt-1">
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
      </PageContainer>
    </main>
  );
}

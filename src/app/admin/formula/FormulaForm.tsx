"use client";

import { useActionState } from "react";
import { ActionState, resetFormulaAction, updateFormulaAction } from "@/lib/actions";
import { DkpFormula, StatWeight } from "@/lib/types";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

const initialState: ActionState = {};

function WeightRow({
  name,
  label,
  weight,
  weightLabel,
}: {
  name: string;
  label: string;
  weight: StatWeight;
  weightLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          name={`${name}_enabled`}
          defaultChecked={weight.enabled}
          className="h-4 w-4 accent-amber-500"
        />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{weightLabel}</span>
        <input
          type="number"
          name={`${name}_weight`}
          defaultValue={weight.weight}
          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>
    </div>
  );
}

export default function FormulaForm({
  kingdomId,
  formula,
  t,
}: {
  kingdomId: string;
  formula: DkpFormula;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(updateFormulaAction, initialState);

  const killRows: { key: keyof DkpFormula; label: string }[] = [
    { key: "kill_t1", label: t.admin.formula.t1 },
    { key: "kill_t2", label: t.admin.formula.t2 },
    { key: "kill_t3", label: t.admin.formula.t3 },
    { key: "kill_t4", label: t.admin.formula.t4 },
    { key: "kill_t5", label: t.admin.formula.t5 },
  ];

  const deadRows: { key: keyof DkpFormula; label: string }[] = [
    { key: "dead_t1", label: t.admin.formula.dt1 },
    { key: "dead_t2", label: t.admin.formula.dt2 },
    { key: "dead_t3", label: t.admin.formula.dt3 },
    { key: "dead_t4", label: t.admin.formula.dt4 },
    { key: "dead_t5", label: t.admin.formula.dt5 },
  ];

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-2xl">
        <PageHeader
          title={formatTemplate(t.admin.formula.title, { id: kingdomId })}
          subtitle={t.admin.formula.subtitle}
        />

        <Card className="p-5">
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="kingdomId" value={kingdomId} />

            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t.admin.formula.kills}
              </h2>
              <div className="flex flex-col gap-2">
                {killRows.map((row) => (
                  <WeightRow
                    key={row.key}
                    name={row.key}
                    label={row.label}
                    weight={formula[row.key]}
                    weightLabel={t.admin.formula.weight}
                  />
                ))}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
              <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t.admin.formula.deadTroops}
              </h2>
              <div className="flex flex-col gap-2">
                {deadRows.map((row) => (
                  <WeightRow
                    key={row.key}
                    name={row.key}
                    label={row.label}
                    weight={formula[row.key]}
                    weightLabel={t.admin.formula.weight}
                  />
                ))}
              </div>
            </section>

            {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
            {state.success && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{t.admin.formula.saveSuccess}</p>
            )}

            <div className="flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {pending ? t.common.saving : t.admin.formula.saveFormula}
              </button>
              <button
                type="button"
                onClick={() => resetFormulaAction(kingdomId)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t.admin.formula.resetDefault}
              </button>
            </div>
          </form>
        </Card>
      </PageContainer>
    </main>
  );
}

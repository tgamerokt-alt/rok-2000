"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { BarItem, ChartCard, fmtCompact, fmtPct, HBarChart, TipRow, TipTitle } from "@/components/charts/Charts";

export interface KvkSummary {
  players: number;
  participation: number;
  totalDkp: number;
  totalKills: number;
  totalDead: number;
  totalPowerChange: number;
  medianDkp: number;
  top10Share: number;
  /** Share of players with a target who passed every requirement; null when no targets apply. */
  targetPass: number | null;
}

export interface PlayerDelta {
  id: string;
  name: string;
  dkpA: number;
  dkpB: number;
}

const COLOR_A = "var(--viz-series-1)";
const COLOR_B = "var(--viz-series-2)";

export default function KvkCompareClient({
  kingdomId,
  menus,
  menuA,
  menuB,
  a,
  b,
  returning,
  newCount,
  leftCount,
  t,
}: {
  kingdomId: string;
  menus: { id: string; name: string; startDate: string }[];
  menuA: { id: string; name: string };
  menuB: { id: string; name: string };
  a: KvkSummary;
  b: KvkSummary;
  returning: PlayerDelta[];
  newCount: number;
  leftCount: number;
  t: Dictionary;
}) {
  const c = t.kvkCompare;
  const router = useRouter();
  const same = menuA.id === menuB.id;

  function choose(which: "a" | "b", id: string) {
    const params = new URLSearchParams({ a: which === "a" ? id : menuA.id, b: which === "b" ? id : menuB.id });
    router.push(`/kingdom/${kingdomId}/compare?${params}`);
  }

  const legend = [
    { color: COLOR_A, label: `A · ${menuA.name}`, shape: "rect" as const },
    { color: COLOR_B, label: `B · ${menuB.name}`, shape: "rect" as const },
  ];

  // Headline metrics: label, value getter, formatter, and whether higher is better.
  const metrics: { label: string; get: (s: KvkSummary) => number | null; fmt: (n: number) => string; higherBetter: boolean }[] = [
    { label: c.players, get: (s) => s.players, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
    { label: c.participation, get: (s) => s.participation, fmt: (n) => fmtPct(n), higherBetter: true },
    { label: c.totalDkp, get: (s) => s.totalDkp, fmt: fmtCompact, higherBetter: true },
    { label: t.kvkSummary.kp, get: (s) => s.totalKills, fmt: fmtCompact, higherBetter: true },
    { label: t.kvkSummary.deadT4T5, get: (s) => s.totalDead, fmt: fmtCompact, higherBetter: true },
    { label: c.medianDkp, get: (s) => s.medianDkp, fmt: fmtCompact, higherBetter: true },
    { label: c.top10Share, get: (s) => s.top10Share, fmt: (n) => fmtPct(n), higherBetter: false },
    { label: c.powerChange, get: (s) => s.totalPowerChange, fmt: (n) => `${n > 0 ? "+" : ""}${fmtCompact(n)}`, higherBetter: true },
    ...(a.targetPass !== null || b.targetPass !== null
      ? [{ label: c.targetPass, get: (s: KvkSummary) => s.targetPass, fmt: (n: number) => fmtPct(n), higherBetter: true }]
      : []),
  ];

  // Same scale within a metric only — one mini chart per metric (never two scales on one axis).
  const pairRows = (get: (s: KvkSummary) => number | null, fmt: (n: number) => string, label: string): BarItem[] =>
    [
      // Short row labels — the legend above carries the full KvK names.
      { key: "a", name: "A", v: get(a) ?? 0, color: COLOR_A },
      { key: "b", name: "B", v: get(b) ?? 0, color: COLOR_B },
    ].map((r) => ({
      key: r.key,
      label: r.name,
      value: Math.abs(r.v),
      valueLabel: fmt(r.v),
      color: r.color,
      tooltip: (
        <>
          <TipTitle>{label}</TipTitle>
          <TipRow color={COLOR_A} label={menuA.name} value={fmt(get(a) ?? 0)} />
          <TipRow color={COLOR_B} label={menuB.name} value={fmt(get(b) ?? 0)} />
        </>
      ),
    }));

  const improvers = [...returning].sort((x, y) => y.dkpB - y.dkpA - (x.dkpB - x.dkpA)).slice(0, 10);
  const decliners = [...returning].sort((x, y) => x.dkpB - x.dkpA - (y.dkpB - y.dkpA)).slice(0, 10);

  const select =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  return (
    <main className="flex-1">
      <PageContainer>
        <PageHeader
          title={formatTemplate(c.title, { id: kingdomId })}
          subtitle={c.subtitle}
          action={
            <Link
              href={`/kingdom/${kingdomId}`}
              className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
            >
              {t.common.backToKvkList}
            </Link>
          }
        />

        <div className="mb-4 flex flex-wrap items-end gap-3">
          {(["a", "b"] as const).map((which) => (
            <label key={which} className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: which === "a" ? COLOR_A : COLOR_B }} />
                {which === "a" ? c.kvkA : c.kvkB}
              </span>
              <select value={which === "a" ? menuA.id : menuB.id} onChange={(e) => choose(which, e.target.value)} className={select}>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.startDate})
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {same && (
          <Card className="mb-4 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {menus.length < 2 ? c.onlyOne : c.sameKvk}
          </Card>
        )}

        {/* Table first: every number, with the change and a ▲/▼ that says whether it got better */}
        <Card className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">{c.metric}</th>
                <th className="px-3 py-2 text-right">A · {menuA.name}</th>
                <th className="px-3 py-2 text-right">B · {menuB.name}</th>
                <th className="px-3 py-2 text-right">{c.change}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {metrics.map((mt) => {
                const va = mt.get(a);
                const vb = mt.get(b);
                const diff = va !== null && vb !== null ? vb - va : null;
                const better = diff !== null && diff !== 0 ? (mt.higherBetter ? diff > 0 : diff < 0) : null;
                return (
                  <tr key={mt.label}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{mt.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{va === null ? "-" : mt.fmt(va)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{vb === null ? "-" : mt.fmt(vb)}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold tabular-nums ${
                        better === null
                          ? "text-slate-400"
                          : better
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {diff === null || diff === 0
                        ? "—"
                        : `${better ? "▲" : "▼"} ${diff > 0 ? "+" : ""}${mt.fmt(diff)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={c.chartTitle} subtitle={c.chartSub} legend={legend}>
            <div className="flex flex-col gap-3">
              {metrics.slice(1, 6).map((mt) => (
                <div key={mt.label}>
                  <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{mt.label}</div>
                  <HBarChart items={pairRows(mt.get, mt.fmt, mt.label)} />
                </div>
              ))}
            </div>
          </ChartCard>

          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{c.rosterTitle}</h3>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[
                  [c.returning, returning.length],
                  [c.newPlayers, newCount],
                  [c.leftPlayers, leftCount],
                ].map(([label, n]) => (
                  <div key={label as string} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{(n as number).toLocaleString("en-US")}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {[
              [c.improvers, improvers],
              [c.decliners, decliners],
            ].map(([title, list]) => (
              <Card key={title as string} className="overflow-x-auto p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{title as string}</h3>
                {(list as PlayerDelta[]).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{c.noReturning}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="py-1 text-left">{t.kvkSummary.player}</th>
                        <th className="py-1 text-right">DKP A</th>
                        <th className="py-1 text-right">DKP B</th>
                        <th className="py-1 text-right">{c.change}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(list as PlayerDelta[]).map((p) => {
                        const d = p.dkpB - p.dkpA;
                        return (
                          <tr key={p.id}>
                            <td className="py-1">
                              <Link href={`/governor/${p.id}`} className="text-slate-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400">
                                {p.name}
                              </Link>
                            </td>
                            <td className="py-1 text-right tabular-nums text-slate-500">{fmtCompact(p.dkpA)}</td>
                            <td className="py-1 text-right tabular-nums text-slate-500">{fmtCompact(p.dkpB)}</td>
                            <td
                              className={`py-1 text-right font-semibold tabular-nums ${
                                d > 0 ? "text-emerald-600 dark:text-emerald-400" : d < 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                              }`}
                            >
                              {d > 0 ? "▲ +" : d < 0 ? "▼ " : ""}
                              {fmtCompact(d)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            ))}
          </div>
        </div>
      </PageContainer>
    </main>
  );
}

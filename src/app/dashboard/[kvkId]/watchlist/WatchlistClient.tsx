"use client";

import { useState } from "react";
import Link from "next/link";
import { ScoredMember } from "@/lib/dkp";
import { KvkMenu, TargetBracket } from "@/lib/types";
import { evaluateTarget, TargetResult } from "@/lib/targets";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { downloadCsv } from "@/lib/csv";
import { fmtCompact, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

type ListKey = "idle" | "lost" | "missed" | "streak";

interface Row {
  m: ScoredMember;
  reason: string;
}

const numberInput =
  "w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function median(values: number[]) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export default function WatchlistClient({
  menu,
  members,
  targets,
  streaks,
  kvkCount,
  t,
}: {
  menu: KvkMenu;
  members: ScoredMember[];
  targets: TargetBracket[];
  /** governor_id → consecutive KvKs (ending with this one) where the target was missed. */
  streaks: Record<string, number>;
  /** How many KvKs of this kingdom exist up to this one (streaks need ≥ 2). */
  kvkCount: number;
  t: Dictionary;
}) {
  const w = t.watchlist;
  const [minPowerM, setMinPowerM] = useState(50);
  const [lossM, setLossM] = useState(3);
  const [minStreak, setMinStreak] = useState(2);
  const [open, setOpen] = useState<ListKey>("idle");

  const complete = members.filter((m) => !m.incomplete);
  const medianDkp = median(complete.filter((m) => m.dkp > 0).map((m) => m.dkp));
  const metricLabel = t.targets.metricColumn;

  const missedText = (r: TargetResult) =>
    r.parts
      .filter((p) => p.value < p.target)
      .map((p) => `${metricLabel[p.metric]} ${fmtCompact(p.value)}/${fmtCompact(p.target)}`)
      .join(", ");

  const lists: { key: ListKey; title: string; desc: string; rows: Row[]; enabled: boolean; disabledNote?: string }[] = [
    {
      key: "idle",
      title: w.idleTitle,
      desc: formatTemplate(w.idleDesc, { min: String(minPowerM) }),
      enabled: true,
      rows: complete
        .filter((m) => m.power_start >= minPowerM * 1e6 && m.dkp === 0)
        .sort((a, b) => b.power_start - a.power_start)
        .map((m) => ({ m, reason: formatTemplate(w.idleReason, { power: fmtCompact(m.power_start) }) })),
    },
    {
      key: "lost",
      title: w.lostTitle,
      desc: formatTemplate(w.lostDesc, { loss: String(lossM), median: fmtCompact(medianDkp) }),
      enabled: true,
      rows: complete
        .filter((m) => m.power_change <= -lossM * 1e6 && m.dkp < medianDkp)
        .sort((a, b) => a.power_change - b.power_change)
        .map((m) => ({
          m,
          reason: formatTemplate(w.lostReason, { loss: fmtCompact(m.power_change), dkp: fmtCompact(m.dkp) }),
        })),
    },
    {
      key: "missed",
      title: w.missedTitle,
      desc: w.missedDesc,
      enabled: targets.length > 0,
      disabledNote: w.noTargets,
      rows: complete
        .map((m) => ({ m, r: evaluateTarget(m, targets) }))
        .filter((x): x is { m: ScoredMember; r: TargetResult } => x.r !== null && !x.r.met)
        .sort((a, b) => b.m.power_start - a.m.power_start)
        .map(({ m, r }) => ({ m, reason: `${w.failed}: ${missedText(r)} (${fmtPct(r.progress)})` })),
    },
    {
      key: "streak",
      title: w.streakTitle,
      desc: formatTemplate(w.streakDesc, { n: String(minStreak) }),
      enabled: targets.length > 0 && kvkCount >= 2,
      disabledNote: targets.length === 0 ? w.noTargets : w.needTwoKvks,
      rows: complete
        .filter((m) => (streaks[m.governor_id] ?? 0) >= minStreak)
        .sort((a, b) => streaks[b.governor_id] - streaks[a.governor_id] || b.power_start - a.power_start)
        .map((m) => ({ m, reason: formatTemplate(w.streakReason, { n: String(streaks[m.governor_id]) }) })),
    },
  ];

  const current = lists.find((l) => l.key === open)!;

  function exportCsv(list: (typeof lists)[number]) {
    downloadCsv(
      `watchlist-${list.key}-${menu.kingdomId}-${menu.startDate}.csv`,
      [
        t.kvkSummary.governorId,
        t.kvkSummary.player,
        w.startPower,
        t.kvkSummary.powerChange,
        t.kvkSummary.dkp,
        t.kvkSummary.kp,
        t.kvkSummary.deadT4T5,
        w.reason,
      ],
      list.rows.map(({ m, reason }) => [
        m.governor_id,
        m.name,
        m.power_start,
        m.power_change,
        m.dkp,
        m.kp_t4t5,
        m.dead_t4t5,
        reason,
      ])
    );
  }

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-6xl">
        <PageHeader
          title={`${w.title} — ${menu.name}`}
          subtitle={formatTemplate(w.subtitle, { id: menu.kingdomId })}
          action={
            <Link
              href={`/dashboard/${menu.id}`}
              className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
            >
              {t.analytics.backToTable}
            </Link>
          }
        />

        {/* One tab per list, with its count — the count alone tells the admin where to look */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {lists.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setOpen(l.key)}
              className={`rounded-xl border p-4 text-left transition ${
                open === l.key
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-slate-200 bg-white hover:border-amber-400 dark:border-slate-700/60 dark:bg-slate-900"
              }`}
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">{l.title}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {l.enabled ? l.rows.length : "—"}
              </div>
            </button>
          ))}
        </div>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{current.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{current.desc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              {open === "idle" && (
                <label className="flex items-center gap-1.5">
                  {w.minPowerLabel}
                  <input type="number" min={0} value={minPowerM} onChange={(e) => setMinPowerM(Number(e.target.value) || 0)} className={numberInput} />
                  M
                </label>
              )}
              {open === "lost" && (
                <label className="flex items-center gap-1.5">
                  {w.lossLabel}
                  <input type="number" min={0} value={lossM} onChange={(e) => setLossM(Number(e.target.value) || 0)} className={numberInput} />
                  M
                </label>
              )}
              {open === "streak" && (
                <label className="flex items-center gap-1.5">
                  {w.streakLabel}
                  <input type="number" min={2} value={minStreak} onChange={(e) => setMinStreak(Math.max(2, Number(e.target.value) || 2))} className={numberInput} />
                </label>
              )}
              {current.enabled && current.rows.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportCsv(current)}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  {t.dashboard.exportCsv}
                </button>
              )}
            </div>
          </div>

          {!current.enabled ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{current.disabledNote}</p>
          ) : current.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{w.nobody}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">{t.kvkSummary.player}</th>
                    <th className="px-3 py-2 text-right">{w.startPower}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.powerChange}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.dkp}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.kp}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.deadT4T5}</th>
                    <th className="px-3 py-2 text-left">{w.reason}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {current.rows.map(({ m, reason }) => (
                    <tr key={m.governor_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2">
                        <Link
                          href={`/governor/${m.governor_id}?kvk=${menu.id}`}
                          className="font-medium text-slate-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400"
                        >
                          {m.name}
                        </Link>
                        <div className="text-[11px] text-slate-500">{m.governor_id}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCompact(m.power_start)}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          m.power_change < 0
                            ? "text-red-600 dark:text-red-400"
                            : m.power_change > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-500"
                        }`}
                      >
                        {m.power_change > 0 ? "+" : ""}
                        {fmtCompact(m.power_change)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCompact(m.dkp)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCompact(m.kp_t4t5)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCompact(m.dead_t4t5)}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageContainer>
    </main>
  );
}

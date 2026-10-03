"use client";

import type { GovernorBreakdown, MetricBenchmark } from "@/lib/data";
import { DkpFormula } from "@/lib/types";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/Card";
import {
  BarItem,
  ChartCard,
  ColumnChart,
  fmtCompact,
  fmtPct,
  HBarChart,
  TipRow,
  TipTitle,
} from "@/components/charts/Charts";

const SERIES = "var(--viz-series-1)";
const MUTED = "var(--viz-muted-mark)";

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "up" | "down" }) {
  const color =
    tone === "down"
      ? "text-red-600 dark:text-red-400"
      : tone === "up"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-900 dark:text-white";
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{sub}</div>
    </Card>
  );
}

export default function GovernorCharts({
  breakdown,
  kvkName,
  trend,
  t,
}: {
  breakdown: GovernorBreakdown | null;
  kvkName: string;
  /** Oldest → newest, one entry per KvK this governor appears in. */
  trend: { key: string; label: string; dkp: number; incomplete: boolean }[];
  t: Dictionary;
}) {
  const g = t.governor;

  const trendCard =
    trend.filter((x) => !x.incomplete).length >= 2 ? (
      <ChartCard title={g.trendTitle} subtitle={g.trendSub}>
        <ColumnChart
          items={trend
            .filter((x) => !x.incomplete)
            .map((x) => ({
              key: x.key,
              label: x.label.length > 12 ? `${x.label.slice(0, 11)}…` : x.label,
              value: x.dkp,
              valueLabel: fmtCompact(x.dkp),
              tooltip: (
                <>
                  <TipTitle>{x.label}</TipTitle>
                  <TipRow color={SERIES} label={t.kvkSummary.dkp} value={fmtCompact(x.dkp)} />
                </>
              ),
            }))}
        />
      </ChartCard>
    ) : (
      <Card className="flex items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {g.trendNeedMore}
      </Card>
    );

  if (!breakdown) {
    return (
      <div className="mb-6 flex flex-col gap-4">
        <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {formatTemplate(g.incompleteNote, { kvk: kvkName })}
        </Card>
        {trendCard}
      </div>
    );
  }

  const { member, playerCount } = breakdown;
  const topPct = (b: MetricBenchmark) =>
    formatTemplate(g.topPct, { pct: fmtPct(b.rank / playerCount, b.rank / playerCount < 0.1 ? 1 : 0), n: String(playerCount) });

  // ---- this player vs the kingdom -------------------------------------
  const compareRows = (b: MetricBenchmark, metric: string): BarItem[] =>
    [
      { key: "me", label: g.thisPlayer, value: b.value, muted: false },
      { key: "median", label: g.medianFought, value: b.median, muted: true },
      { key: "top10", label: g.top10Avg, value: b.top10Avg, muted: true },
    ].map((r) => ({
      ...r,
      valueLabel: fmtCompact(r.value),
      tooltip: (
        <>
          <TipTitle>{r.label}</TipTitle>
          <TipRow color={r.muted ? MUTED : SERIES} label={metric} value={fmtCompact(r.value)} />
          {r.key !== "me" && b.value > 0 && r.value > 0 && (
            <TipRow label={g.vsThisPlayer} value={`×${(b.value / r.value).toFixed(2)}`} />
          )}
        </>
      ),
    }));

  // ---- where the DKP came from ----------------------------------------
  const termLabel = (key: keyof DkpFormula) => {
    const tier = key.slice(-1);
    return key.startsWith("kill")
      ? t.admin.formula[`t${tier}` as "t1"]
      : t.admin.formula[`dt${tier}` as "dt1"];
  };
  const sourceItems: BarItem[] = breakdown.contributions
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((c) => ({
      key: c.key,
      label: `${termLabel(c.key)} ×${c.weight}`,
      value: c.points,
      valueLabel: fmtCompact(c.points),
      tooltip: (
        <>
          <TipTitle>{termLabel(c.key)}</TipTitle>
          <TipRow color={SERIES} label={t.kvkSummary.dkp} value={fmtCompact(c.points)} />
          <TipRow label={g.count} value={c.count.toLocaleString("en-US")} />
          <TipRow label={g.weight} value={`×${c.weight}`} />
          {member.dkp > 0 && <TipRow label={g.shareOfPlayerDkp} value={fmtPct(c.points / member.dkp, 1)} />}
        </>
      ),
    }));

  // ---- kills / dead by tier ---------------------------------------------
  const tierItems = (kind: "kill" | "dead"): BarItem[] => {
    const values = ([1, 2, 3, 4, 5] as const).map((n) => member[`${kind}_t${n}` as keyof typeof member] as number);
    const total = values.reduce((s, v) => s + v, 0);
    return values.map((v, i) => {
      const label = `T${i + 1}`;
      return {
        key: label,
        label,
        value: v,
        valueLabel: fmtCompact(v),
        tooltip: (
          <>
            <TipTitle>{kind === "kill" ? termLabel(`kill_t${i + 1}` as keyof DkpFormula) : termLabel(`dead_t${i + 1}` as keyof DkpFormula)}</TipTitle>
            <TipRow color={SERIES} label={g.count} value={v.toLocaleString("en-US")} />
            {total > 0 && <TipRow label={g.ofAllTiers} value={fmtPct(v / total, 1)} />}
          </>
        ),
      };
    });
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={g.rankDkp} value={`#${breakdown.dkp.rank}`} sub={topPct(breakdown.dkp)} />
        <Kpi label={g.rankKills} value={`#${breakdown.kills.rank}`} sub={topPct(breakdown.kills)} />
        <Kpi label={g.rankDead} value={`#${breakdown.dead.rank}`} sub={topPct(breakdown.dead)} />
        <Kpi
          label={t.kvkSummary.powerChange}
          value={`${member.power_change > 0 ? "+" : ""}${fmtCompact(member.power_change)}`}
          sub={formatTemplate(g.powerChangeSub, { start: fmtCompact(member.power_start), end: fmtCompact(member.power) })}
          tone={member.power_change < 0 ? "down" : member.power_change > 0 ? "up" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={g.compareTitle} subtitle={formatTemplate(g.compareSub, { kvk: kvkName })}>
          <div className="flex flex-col gap-3">
            {(
              [
                [t.kvkSummary.dkp, breakdown.dkp],
                [t.kvkSummary.kp, breakdown.kills],
                [t.kvkSummary.deadT4T5, breakdown.dead],
              ] as const
            ).map(([metric, b]) => (
              <div key={metric}>
                <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{metric}</div>
                <HBarChart items={compareRows(b, metric)} />
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={g.sourceTitle} subtitle={g.sourceSub}>
          {sourceItems.length > 0 ? (
            <HBarChart items={sourceItems} />
          ) : (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{g.noDkp}</p>
          )}
        </ChartCard>

        <ChartCard title={g.killsTierTitle} subtitle={formatTemplate(g.tierSub, { kvk: kvkName })}>
          <HBarChart items={tierItems("kill")} />
        </ChartCard>

        <ChartCard title={g.deadTierTitle} subtitle={formatTemplate(g.tierSub, { kvk: kvkName })}>
          <HBarChart items={tierItems("dead")} />
        </ChartCard>
      </div>

      {trendCard}
    </div>
  );
}

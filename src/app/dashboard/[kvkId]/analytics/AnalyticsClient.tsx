"use client";

import Link from "next/link";
import { ScoredMember } from "@/lib/dkp";
import { KvkMenu } from "@/lib/types";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import {
  BarItem,
  ChartCard,
  ColumnChart,
  ColumnItem,
  CumulativeChart,
  fmtCompact,
  fmtPct,
  HBarChart,
  ScatterChart,
  ScatterPoint,
  TipRow,
  TipTitle,
} from "@/components/charts/Charts";

const SERIES = "var(--viz-series-1)";
const NEGATIVE = "var(--viz-negative)";
const MUTED = "var(--viz-muted-mark)";

/** Below this starting power, DKP-per-power is dominated by noise (tiny accounts). */
const EFFICIENCY_MIN_POWER = 10_000_000;

const POWER_BRACKETS: { min: number; max: number; label: string }[] = [
  { min: 0, max: 20e6, label: "<20M" },
  { min: 20e6, max: 40e6, label: "20–40M" },
  { min: 40e6, max: 60e6, label: "40–60M" },
  { min: 60e6, max: 80e6, label: "60–80M" },
  { min: 80e6, max: 100e6, label: "80–100M" },
  { min: 100e6, max: Infinity, label: "100M+" },
];

/** Power-change bins in millions; the first four are losses (drawn red), the rest gains. */
const CHANGE_BINS: { min: number; max: number; label: string }[] = [
  { min: -Infinity, max: -10e6, label: "≤-10M" },
  { min: -10e6, max: -5e6, label: "-10~-5M" },
  { min: -5e6, max: -2e6, label: "-5~-2M" },
  { min: -2e6, max: 0, label: "-2~0M" },
  { min: 0, max: 2e6, label: "0~2M" },
  { min: 2e6, max: 5e6, label: "2~5M" },
  { min: 5e6, max: 10e6, label: "5~10M" },
  { min: 10e6, max: Infinity, label: "≥10M" },
];

function median(values: number[]) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{sub}</div>
    </Card>
  );
}

export default function AnalyticsClient({
  menu,
  members,
  t,
}: {
  menu: KvkMenu;
  members: ScoredMember[];
  t: Dictionary;
}) {
  const a = t.analytics;
  // Incomplete rows (in only one snapshot) have no real stats — leave them out of every aggregate.
  const complete = members.filter((m) => !m.incomplete);
  const byDkp = [...complete].sort((x, y) => y.dkp - x.dkp);
  const totalDkp = byDkp.reduce((s, m) => s + m.dkp, 0);

  const header = (
    <PageHeader
      title={`${a.title} — ${menu.name}`}
      subtitle={`${t.common.kingdom} ${menu.kingdomId} · ${menu.startDate} — ${menu.endDate} · ${complete.length} ${t.dashboard.players}`}
      action={
        <Link
          href={`/dashboard/${menu.id}`}
          className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
        >
          {a.backToTable}
        </Link>
      }
    />
  );

  if (complete.length === 0 || totalDkp <= 0) {
    return (
      <main className="flex-1">
        <PageContainer>
          {header}
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{a.noData}</Card>
        </PageContainer>
      </main>
    );
  }

  // ---- headline numbers -------------------------------------------------
  const participants = complete.filter((m) => m.dkp > 0);
  const participation = participants.length / complete.length;
  const top10 = byDkp.slice(0, 10);
  const top10Share = top10.reduce((s, m) => s + m.dkp, 0) / totalDkp;
  const medianDkp = median(participants.map((m) => m.dkp));
  const losers = complete.filter((m) => m.power_change < 0);
  const totalLost = losers.reduce((s, m) => s + m.power_change, 0);

  const memberTip = (m: ScoredMember) => (
    <>
      <TipTitle>{m.name}</TipTitle>
      <TipRow color={SERIES} label={a.dkp} value={fmtCompact(m.dkp)} />
      <TipRow label={a.kills} value={fmtCompact(m.kp_t4t5)} />
      <TipRow label={a.dead} value={fmtCompact(m.dead_t4t5)} />
      <TipRow label={a.startingPower} value={fmtCompact(m.power_start)} />
    </>
  );

  // ---- top 15 by DKP ----------------------------------------------------
  const topItems: BarItem[] = byDkp.slice(0, 15).map((m) => ({
    key: m.governor_id,
    label: m.name,
    value: m.dkp,
    valueLabel: fmtCompact(m.dkp),
    tooltip: memberTip(m),
  }));

  // ---- efficiency: DKP per 1M starting power ---------------------------
  const efficiency = complete
    .filter((m) => m.power_start >= EFFICIENCY_MIN_POWER && m.dkp > 0)
    .map((m) => ({ m, perM: m.dkp / (m.power_start / 1e6) }))
    .sort((x, y) => y.perM - x.perM);
  const efficiencyItems: BarItem[] = efficiency.slice(0, 10).map(({ m, perM }) => ({
    key: m.governor_id,
    label: m.name,
    value: perM,
    valueLabel: fmtCompact(perM),
    tooltip: (
      <>
        <TipTitle>{m.name}</TipTitle>
        <TipRow color={SERIES} label={a.dkpPerM} value={fmtCompact(perM)} />
        <TipRow label={a.dkp} value={fmtCompact(m.dkp)} />
        <TipRow label={a.startingPower} value={fmtCompact(m.power_start)} />
      </>
    ),
  }));

  // ---- power vs DKP scatter --------------------------------------------
  const top10Ids = new Set(top10.map((m) => m.governor_id));
  const scatterPoints: ScatterPoint[] = complete.map((m) => ({
    key: m.governor_id,
    x: m.power_start,
    y: m.dkp,
    emphasis: top10Ids.has(m.governor_id),
    tooltip: memberTip(m),
  }));

  // ---- concentration curve ---------------------------------------------
  const curve = [{ x: 0, y: 0 }];
  for (let i = 0, running = 0; i < byDkp.length; i++) {
    running += byDkp[i].dkp;
    curve.push({ x: (i + 1) / byDkp.length, y: running / totalDkp });
  }
  const at20 = curve.reduce((best, p) => (Math.abs(p.x - 0.2) < Math.abs(best.x - 0.2) ? p : best), curve[0]);

  // ---- average DKP by power bracket ------------------------------------
  const brackets = POWER_BRACKETS.map((b) => {
    const inB = complete.filter((m) => m.power_start >= b.min && m.power_start < b.max);
    const dkp = inB.reduce((s, m) => s + m.dkp, 0);
    const active = inB.filter((m) => m.dkp > 0).length;
    return { ...b, count: inB.length, dkp, avg: inB.length ? dkp / inB.length : 0, active };
  }).filter((b) => b.count > 0);
  const bracketItems: ColumnItem[] = brackets.map((b) => ({
    key: b.label,
    label: b.label,
    value: b.avg,
    valueLabel: fmtCompact(b.avg),
    tooltip: (
      <>
        <TipTitle>{b.label}</TipTitle>
        <TipRow color={SERIES} label={a.avgDkp} value={fmtCompact(b.avg)} />
        <TipRow label={t.dashboard.players} value={b.count.toLocaleString("en-US")} />
        <TipRow label={a.participationLbl} value={fmtPct(b.active / b.count)} />
        <TipRow label={a.shareOfDkp} value={fmtPct(b.dkp / totalDkp, 1)} />
      </>
    ),
  }));
  const bestBracket = [...brackets].sort((x, y) => y.avg - x.avg)[0];

  // ---- power change histogram ------------------------------------------
  const changeItems: ColumnItem[] = CHANGE_BINS.map((b, i) => {
    const inB = complete.filter((m) => m.power_change >= b.min && m.power_change < b.max);
    const negative = i < 4;
    return {
      key: b.label,
      label: b.label,
      value: inB.length,
      valueLabel: inB.length.toLocaleString("en-US"),
      tone: negative ? "negative" : "positive",
      tooltip: (
        <>
          <TipTitle>{b.label}</TipTitle>
          <TipRow
            color={negative ? NEGATIVE : SERIES}
            label={t.dashboard.players}
            value={inB.length.toLocaleString("en-US")}
          />
          <TipRow label={a.ofPlayers} value={fmtPct(inB.length / complete.length, 1)} />
        </>
      ),
    };
  });

  // ---- written insights -------------------------------------------------
  const biggestLoss = [...losers].sort((x, y) => x.power_change - y.power_change)[0];
  const idle = complete.length - participants.length;
  const insights = [
    formatTemplate(a.insightTop10, { share: fmtPct(top10Share) }),
    formatTemplate(a.insightTop20, { share: fmtPct(at20.y) }),
    efficiency[0] &&
      formatTemplate(a.insightEfficient, { name: efficiency[0].m.name, value: fmtCompact(efficiency[0].perM) }),
    bestBracket && formatTemplate(a.insightBracket, { bracket: bestBracket.label, value: fmtCompact(bestBracket.avg) }),
    biggestLoss && formatTemplate(a.insightLoss, { name: biggestLoss.name, value: fmtCompact(biggestLoss.power_change) }),
    idle > 0 && formatTemplate(a.insightIdle, { n: idle.toLocaleString("en-US"), pct: fmtPct(idle / complete.length) }),
  ].filter(Boolean) as string[];

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-none">
        {header}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label={a.kpiParticipation}
            value={fmtPct(participation)}
            sub={formatTemplate(a.kpiParticipationSub, {
              n: participants.length.toLocaleString("en-US"),
              total: complete.length.toLocaleString("en-US"),
            })}
          />
          <Kpi
            label={a.kpiTop10Share}
            value={fmtPct(top10Share)}
            sub={formatTemplate(a.kpiTop10ShareSub, { total: fmtCompact(totalDkp) })}
          />
          <Kpi label={a.kpiMedian} value={fmtCompact(medianDkp)} sub={a.kpiMedianSub} />
          <Kpi
            label={a.kpiLostPower}
            value={losers.length.toLocaleString("en-US")}
            sub={formatTemplate(a.kpiLostPowerSub, { amount: fmtCompact(totalLost) })}
          />
        </div>

        <Card className="mb-6 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{a.insightsTitle}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {insights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={a.topDkpTitle} subtitle={a.topDkpSub}>
            <HBarChart items={topItems} />
          </ChartCard>

          <ChartCard title={a.efficiencyTitle} subtitle={a.efficiencySub}>
            <HBarChart items={efficiencyItems} />
          </ChartCard>

          <ChartCard
            title={a.scatterTitle}
            subtitle={a.scatterSub}
            legend={[
              { color: SERIES, label: a.legendTop10 },
              { color: MUTED, label: a.legendOthers },
            ]}
          >
            <ScatterChart points={scatterPoints} xLabel={a.startingPower} yLabel={a.dkp} />
          </ChartCard>

          <ChartCard title={a.paretoTitle} subtitle={a.paretoSub}>
            <CumulativeChart
              points={curve}
              annotateAt={0.2}
              annotationLabel={formatTemplate(a.paretoAnnot, { pct: fmtPct(at20.y) })}
              referenceLabel={a.equalLine}
              tooltipFor={(p) => (
                <>
                  <TipTitle>{formatTemplate(a.paretoTooltip, { x: fmtPct(p.x) })}</TipTitle>
                  <TipRow color={SERIES} label={a.shareOfDkp} value={fmtPct(p.y, 1)} />
                </>
              )}
            />
          </ChartCard>

          <ChartCard title={a.bracketTitle} subtitle={a.bracketSub}>
            <ColumnChart items={bracketItems} />
          </ChartCard>

          <ChartCard
            title={a.powerChangeTitle}
            subtitle={a.powerChangeSub}
            legend={[
              { color: NEGATIVE, label: a.legendLost, shape: "rect" },
              { color: SERIES, label: a.legendGained, shape: "rect" },
            ]}
          >
            <ColumnChart items={changeItems} formatTick={(n) => n.toLocaleString("en-US")} />
          </ChartCard>
        </div>
      </PageContainer>
    </main>
  );
}

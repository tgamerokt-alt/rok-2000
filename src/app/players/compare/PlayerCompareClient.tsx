"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoredMember } from "@/lib/dkp";
import { DkpFormula, KvkMenu, TargetBracket } from "@/lib/types";
import { activeMetrics, evaluateTarget, partOf } from "@/lib/targets";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import {
  BarItem,
  ChartCard,
  fmtCompact,
  fmtPct,
  GroupedBarItem,
  GroupedHBarChart,
  HBarChart,
  TipRow,
  TipTitle,
} from "@/components/charts/Charts";

const COLOR_A = "var(--viz-series-1)";
const COLOR_B = "var(--viz-series-2)";
const TIERS = [1, 2, 3, 4, 5] as const;

/** Search-as-you-type picker over this KvK's governors (name or ID). */
function PlayerPicker({
  members,
  value,
  color,
  label,
  placeholder,
  onPick,
}: {
  members: ScoredMember[];
  value: ScoredMember | null;
  color: string;
  label: string;
  placeholder: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = (q
    ? members.filter((m) => m.name.toLowerCase().includes(q) || m.previous_name?.toLowerCase().includes(q) || m.governor_id.includes(q))
    : [...members].sort((x, y) => y.dkp - x.dkp)
  ).slice(0, 8);

  return (
    <div ref={ref} className="relative flex-1 min-w-56">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <input
        value={open ? query : value ? `${value.name} (${value.governor_id})` : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-300 bg-white py-1 shadow-xl shadow-slate-900/10 dark:border-slate-600 dark:bg-slate-800 dark:shadow-black/60">
          {matches.map((m) => (
            <button
              key={m.governor_id}
              type="button"
              onClick={() => {
                onPick(m.governor_id);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-amber-50 dark:hover:bg-slate-700"
            >
              <span className="truncate text-slate-800 dark:text-slate-100">{m.name}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                {m.governor_id} · DKP {fmtCompact(m.dkp)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerCompareClient({
  menus,
  menu,
  members,
  formula,
  targets,
  initialA,
  initialB,
  t,
}: {
  menus: { id: string; name: string; kingdomId: string }[];
  menu: KvkMenu;
  members: ScoredMember[];
  formula: DkpFormula;
  targets: TargetBracket[];
  initialA: string;
  initialB: string;
  t: Dictionary;
}) {
  const c = t.playerCompare;
  const router = useRouter();
  const [aId, setAId] = useState(initialA);
  const [bId, setBId] = useState(initialB);

  const byId = useMemo(() => new Map(members.map((m) => [m.governor_id, m])), [members]);
  const rankOf = useMemo(() => {
    const ranked = members.filter((m) => !m.incomplete).sort((x, y) => y.dkp - x.dkp);
    return new Map(ranked.map((m, i) => [m.governor_id, i + 1]));
  }, [members]);
  const a = byId.get(aId) ?? null;
  const b = byId.get(bId) ?? null;

  // Keep the URL in sync so a comparison can be shared as a link.
  function pick(which: "a" | "b", id: string) {
    const nextA = which === "a" ? id : aId;
    const nextB = which === "b" ? id : bId;
    if (which === "a") setAId(id);
    else setBId(id);
    const params = new URLSearchParams({ kvk: menu.id });
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    router.replace(`/players/compare?${params}`, { scroll: false });
  }

  const legend = a && b ? [
    { color: COLOR_A, label: a.name, shape: "rect" as const },
    { color: COLOR_B, label: b.name, shape: "rect" as const },
  ] : [];

  const playerTip = (title: string, rows: [ScoredMember, string][]) => (
    <>
      <TipTitle>{title}</TipTitle>
      {rows.map(([m, v], i) => (
        <TipRow key={m.governor_id + i} color={i === 0 ? COLOR_A : COLOR_B} label={m.name} value={v} />
      ))}
    </>
  );

  let body: React.ReactNode;
  if (!a || !b) {
    body = <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{c.pickTwo}</Card>;
  } else if (a.governor_id === b.governor_id) {
    body = <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{c.samePlayer}</Card>;
  } else if (a.incomplete || b.incomplete) {
    body = (
      <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
        {formatTemplate(c.incomplete, { name: (a.incomplete ? a : b).name })}
      </Card>
    );
  } else {
    // ---- headline metrics, each on its own scale --------------------------
    const metrics: { label: string; get: (m: ScoredMember) => number }[] = [
      { label: t.kvkSummary.dkp, get: (m) => m.dkp },
      { label: t.kvkSummary.kp, get: (m) => m.kp_t4t5 },
      { label: t.kvkSummary.deadT4T5, get: (m) => m.dead_t4t5 },
      { label: c.startingPower, get: (m) => m.power_start },
    ];
    const metricRows = (get: (m: ScoredMember) => number, label: string): BarItem[] =>
      [a, b].map((m, i) => ({
        key: m.governor_id,
        label: m.name,
        value: get(m),
        valueLabel: fmtCompact(get(m)),
        color: i === 0 ? COLOR_A : COLOR_B,
        tooltip: playerTip(label, [[a, fmtCompact(get(a))], [b, fmtCompact(get(b))]]),
      }));

    const tierItems = (kind: "kill" | "dead"): GroupedBarItem[] =>
      TIERS.map((n) => {
        const key = `${kind}_t${n}` as const;
        const label = kind === "kill" ? t.admin.formula[`t${n}`] : t.admin.formula[`dt${n}`];
        return {
          key,
          label: `T${n}`,
          values: [
            { value: a[key], valueLabel: fmtCompact(a[key]), color: COLOR_A },
            { value: b[key], valueLabel: fmtCompact(b[key]), color: COLOR_B },
          ],
          tooltip: playerTip(label, [[a, a[key].toLocaleString("en-US")], [b, b[key].toLocaleString("en-US")]]),
        };
      });

    const terms = (Object.keys(formula) as (keyof DkpFormula)[]).filter(
      (k) => formula[k].enabled && formula[k].weight !== 0 && (a[k] > 0 || b[k] > 0)
    );
    const sourceItems: GroupedBarItem[] = terms.map((k) => {
      const tier = k.slice(-1) as "1";
      const name = k.startsWith("kill") ? t.admin.formula[`t${tier}`] : t.admin.formula[`dt${tier}`];
      const pa = a[k] * formula[k].weight;
      const pb = b[k] * formula[k].weight;
      return {
        key: k,
        label: `${name} ×${formula[k].weight}`,
        values: [
          { value: pa, valueLabel: fmtCompact(pa), color: COLOR_A },
          { value: pb, valueLabel: fmtCompact(pb), color: COLOR_B },
        ],
        tooltip: playerTip(name, [[a, fmtCompact(pa)], [b, fmtCompact(pb)]]),
      };
    });

    // ---- full table (also the accessible, no-hover view of every value) ----
    const ta = evaluateTarget(a, targets);
    const tb = evaluateTarget(b, targets);
    const perM = (m: ScoredMember) => (m.power_start > 0 ? m.dkp / (m.power_start / 1e6) : 0);
    const kd = (m: ScoredMember) => (m.dead_t4t5 > 0 ? m.kp_t4t5 / m.dead_t4t5 : 0);
    const tableRows: { label: string; va: number; vb: number; fmt: (n: number) => string; higherBetter: boolean }[] = [
      { label: c.dkpRank, va: rankOf.get(a.governor_id) ?? 0, vb: rankOf.get(b.governor_id) ?? 0, fmt: (n) => `#${n}`, higherBetter: false },
      { label: t.kvkSummary.dkp, va: a.dkp, vb: b.dkp, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: c.startingPower, va: a.power_start, vb: b.power_start, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: t.kvkSummary.power, va: a.power, vb: b.power, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: t.kvkSummary.powerChange, va: a.power_change, vb: b.power_change, fmt: (n) => `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`, higherBetter: true },
      { label: t.kvkSummary.kp, va: a.kp_t4t5, vb: b.kp_t4t5, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: t.kvkSummary.kpTotal, va: a.total_kill_points, vb: b.total_kill_points, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: t.kvkSummary.deadT4T5, va: a.dead_t4t5, vb: b.dead_t4t5, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: t.kvkSummary.dead, va: a.dead_total, vb: b.dead_total, fmt: (n) => n.toLocaleString("en-US"), higherBetter: true },
      { label: c.dkpPerM, va: perM(a), vb: perM(b), fmt: (n) => fmtCompact(n), higherBetter: true },
      { label: c.killsPerDead, va: kd(a), vb: kd(b), fmt: (n) => n.toFixed(2), higherBetter: true },
    ];
    // Each requirement on its own row, then the overall result (share of requirements passed).
    for (const metric of activeMetrics(targets)) {
      const pa = partOf(ta, metric);
      const pb = partOf(tb, metric);
      if (!pa && !pb) continue;
      tableRows.push({
        label: `${t.targets.column} · ${t.targets.metricColumn[metric]}`,
        va: pa ? pa.value / pa.target : 0,
        vb: pb ? pb.value / pb.target : 0,
        fmt: (n) => fmtPct(n),
        higherBetter: true,
      });
    }
    if (ta || tb) {
      const passShare = (r: typeof ta) => (r ? r.parts.filter((p) => p.value >= p.target).length / r.parts.length : 0);
      tableRows.push({
        label: `${t.targets.column} · ${c.overall}`,
        va: passShare(ta),
        vb: passShare(tb),
        fmt: (n) => (n >= 1 ? `✓ ${fmtPct(n)}` : `✗ ${fmtPct(n)}`),
        higherBetter: true,
      });
    }

    body = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[a, b].map((m, i) => (
            <Card key={m.governor_id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: i === 0 ? COLOR_A : COLOR_B }} />
                <Link
                  href={`/governor/${m.governor_id}?kvk=${menu.id}`}
                  className="text-lg font-bold text-slate-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400"
                >
                  {m.name}
                </Link>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ID {m.governor_id} · {formatTemplate(c.rankLine, { rank: String(rankOf.get(m.governor_id) ?? "-"), n: String(rankOf.size) })}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {fmtCompact(m.dkp)} <span className="text-sm font-normal text-slate-500">DKP</span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={c.overviewTitle} subtitle={c.overviewSub} legend={legend}>
            <div className="flex flex-col gap-3">
              {metrics.map((mt) => (
                <div key={mt.label}>
                  <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{mt.label}</div>
                  <HBarChart items={metricRows(mt.get, mt.label)} />
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title={c.sourceTitle} subtitle={c.sourceSub} legend={legend}>
            {sourceItems.length > 0 ? (
              <GroupedHBarChart items={sourceItems} />
            ) : (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{c.noDkp}</p>
            )}
          </ChartCard>

          <ChartCard title={c.killsTierTitle} legend={legend}>
            <GroupedHBarChart items={tierItems("kill")} />
          </ChartCard>

          <ChartCard title={c.deadTierTitle} legend={legend}>
            <GroupedHBarChart items={tierItems("dead")} />
          </ChartCard>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">{c.stat}</th>
                {[a, b].map((m, i) => (
                  <th key={m.governor_id} className="whitespace-normal px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: i === 0 ? COLOR_A : COLOR_B }} />
                      {m.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {tableRows.map((r) => {
                const aWins = r.va !== r.vb && (r.higherBetter ? r.va > r.vb : r.va < r.vb);
                const bWins = r.va !== r.vb && !aWins;
                return (
                  <tr key={r.label}>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.label}</td>
                    {[
                      [r.va, aWins],
                      [r.vb, bWins],
                    ].map(([v, wins], i) => (
                      <td
                        key={i}
                        className={`px-3 py-2 text-right tabular-nums ${
                          wins ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {r.fmt(v as number)}
                        {wins && <span className="ml-1 text-amber-500" aria-label={c.better}>▲</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex-1">
      <PageContainer>
        <PageHeader title={c.title} subtitle={c.subtitle} />

        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{c.kvk}</div>
            <select
              value={menu.id}
              onChange={(e) => {
                const params = new URLSearchParams({ kvk: e.target.value });
                if (aId) params.set("a", aId);
                if (bId) params.set("b", bId);
                router.push(`/players/compare?${params}`);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · KD {m.kingdomId}
                </option>
              ))}
            </select>
          </div>
          <PlayerPicker
            members={members}
            value={a}
            color={COLOR_A}
            label={c.playerA}
            placeholder={c.searchPlaceholder}
            onPick={(id) => pick("a", id)}
          />
          <PlayerPicker
            members={members}
            value={b}
            color={COLOR_B}
            label={c.playerB}
            placeholder={c.searchPlaceholder}
            onPick={(id) => pick("b", id)}
          />
        </div>

        {body}
      </PageContainer>
    </main>
  );
}

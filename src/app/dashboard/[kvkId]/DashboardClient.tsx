"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ScoredMember } from "@/lib/dkp";
import { KvkMenu, TargetBracket } from "@/lib/types";
import { activeMetrics, evaluateTarget, partOf, TargetMetric } from "@/lib/targets";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { downloadCsv } from "@/lib/csv";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { StatCard } from "@/components/ui/StatCard";
import { RankBadge } from "@/components/ui/RankBadge";
import { ColumnToggle } from "@/components/ui/ColumnToggle";
import PlayerLink from "@/components/ui/PlayerLink";

const PAGE_SIZE = 50;

type SortKey =
  | "name"
  | "power"
  | "power_change"
  | "kill_t4"
  | "kill_t5"
  | "kp_t4t5"
  | "kp_weighted_all"
  | "total_kill_points"
  | "dead_t4"
  | "dead_t5"
  | "dead_t4t5"
  | "dead_total"
  | "dkp"
  | "target"
  | "target_kills"
  | "target_dead"
  | "target_dkp";

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function fmtSigned(n: number) {
  return n > 0 ? `+${fmt(n)}` : fmt(n);
}

/** Renders a stat cell, or a dash when the row is missing from one of the
 * two snapshots (see `DiffedStat.incomplete` in dkp.ts). */
function cell(member: ScoredMember, format: (n: number) => string, value: number) {
  return member.incomplete ? "-" : format(value);
}

interface ColumnDef {
  key: SortKey;
  label: string;
  cellClassName: (m: ScoredMember) => string;
  render: (m: ScoredMember) => string;
  csv: (m: ScoredMember) => string | number;
}

export default function DashboardClient({
  menu,
  members,
  targets,
  t,
}: {
  menu: KvkMenu;
  members: ScoredMember[];
  /** This kingdom's KvK target brackets — empty means no targets set (no column / filter). */
  targets: TargetBracket[];
  t: Dictionary;
}) {
  const [targetFilter, setTargetFilter] = useState<"all" | "met" | "missed" | `missed_${TargetMetric}`>("all");
  const metrics = activeMetrics(targets);
  const targetById = useMemo(
    () => new Map(members.map((m) => [m.governor_id, evaluateTarget(m, targets)])),
    [members, targets]
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dkp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [hiddenCols, setHiddenCols] = useState<Set<SortKey>>(new Set());

  const columns: ColumnDef[] = [
    {
      key: "power",
      label: t.dashboard.power,
      cellClassName: () => "text-blue-700 dark:text-blue-300",
      render: (m) => cell(m, fmt, m.power),
      csv: (m) => (m.incomplete ? "-" : m.power),
    },
    {
      key: "power_change",
      label: t.kvkSummary.powerChange,
      cellClassName: (m) =>
        m.incomplete
          ? "text-slate-500"
          : m.power_change < 0
            ? "text-red-600 dark:text-red-400"
            : m.power_change > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-500",
      render: (m) => cell(m, fmtSigned, m.power_change),
      csv: (m) => (m.incomplete ? "-" : m.power_change),
    },
    {
      key: "kill_t4",
      label: t.kvkSummary.t4Kills,
      cellClassName: () => "text-cyan-700 dark:text-cyan-300",
      render: (m) => cell(m, fmt, m.kill_t4),
      csv: (m) => (m.incomplete ? "-" : m.kill_t4),
    },
    {
      key: "kill_t5",
      label: t.kvkSummary.t5Kills,
      cellClassName: () => "text-yellow-700 dark:text-yellow-300",
      render: (m) => cell(m, fmt, m.kill_t5),
      csv: (m) => (m.incomplete ? "-" : m.kill_t5),
    },
    {
      key: "kp_t4t5",
      label: t.kvkSummary.kp,
      cellClassName: () => "text-fuchsia-700 dark:text-fuchsia-300",
      render: (m) => cell(m, fmt, m.kp_t4t5),
      csv: (m) => (m.incomplete ? "-" : m.kp_t4t5),
    },
    {
      key: "kp_weighted_all",
      label: t.kvkSummary.kpWeighted,
      cellClassName: () => "text-fuchsia-700 dark:text-fuchsia-300",
      render: (m) => cell(m, fmt, m.kp_weighted_all),
      csv: (m) => (m.incomplete ? "-" : m.kp_weighted_all),
    },
    {
      key: "total_kill_points",
      label: t.kvkSummary.kpTotal,
      cellClassName: () => "text-fuchsia-600 dark:text-fuchsia-400",
      render: (m) => cell(m, fmt, m.total_kill_points),
      csv: (m) => (m.incomplete ? "-" : m.total_kill_points),
    },
    {
      key: "dead_t4",
      label: t.kvkSummary.deadT4,
      cellClassName: () => "text-red-700 dark:text-red-300",
      render: (m) => cell(m, fmt, m.dead_t4),
      csv: (m) => (m.incomplete ? "-" : m.dead_t4),
    },
    {
      key: "dead_t5",
      label: t.kvkSummary.deadT5,
      cellClassName: () => "text-red-700 dark:text-red-300",
      render: (m) => cell(m, fmt, m.dead_t5),
      csv: (m) => (m.incomplete ? "-" : m.dead_t5),
    },
    {
      key: "dead_t4t5",
      label: t.kvkSummary.deadT4T5,
      cellClassName: () => "text-red-600 dark:text-red-400",
      render: (m) => cell(m, fmt, m.dead_t4t5),
      csv: (m) => (m.incomplete ? "-" : m.dead_t4t5),
    },
    {
      key: "dead_total",
      label: t.kvkSummary.dead,
      cellClassName: () => "text-red-600 dark:text-red-400",
      render: (m) => cell(m, fmt, m.dead_total),
      csv: (m) => (m.incomplete ? "-" : m.dead_total),
    },
    {
      key: "dkp",
      label: t.kvkSummary.dkp,
      cellClassName: () => "font-bold text-amber-600 dark:text-amber-400",
      render: (m) => cell(m, fmt, m.dkp),
      csv: (m) => (m.incomplete ? "-" : m.dkp),
    },
  ];

  if (targets.length > 0) {
    // Status is never color-alone: ✓ / ✗ ride along with every percentage.
    const statusClass = (ok: boolean | null) =>
      ok === null
        ? "text-slate-400"
        : ok
          ? "whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400"
          : "whitespace-nowrap font-semibold text-red-600 dark:text-red-400";
    const pctText = (ratio: number) => `${Math.round(ratio * 100)}%`;

    // One column per requirement (kills / dead / DKP), each judged on its own…
    const perMetric: ColumnDef[] = metrics.map((metric) => ({
      key: `target_${metric}` as SortKey,
      label: t.targets.metricColumn[metric],
      cellClassName: (m) => {
        const p = partOf(targetById.get(m.governor_id), metric);
        return statusClass(p ? p.value >= p.target : null);
      },
      // "—" = this player's bracket doesn't require this one; "-" = no target at all.
      render: (m) => {
        const r = targetById.get(m.governor_id);
        const p = partOf(r, metric);
        if (!p) return r ? "—" : "-";
        return `${p.value >= p.target ? "✓" : "✗"} ${pctText(p.value / p.target)}`;
      },
      csv: (m) => {
        const p = partOf(targetById.get(m.governor_id), metric);
        return p ? pctText(p.value / p.target) : "-";
      },
    }));

    // …then the overall result: met only when every required one is met.
    const overall: ColumnDef = {
      key: "target",
      label: t.targets.column,
      cellClassName: (m) => {
        const r = targetById.get(m.governor_id);
        return statusClass(r ? r.met : null);
      },
      render: (m) => {
        const r = targetById.get(m.governor_id);
        if (!r) return "-";
        const passed = r.parts.filter((p) => p.value >= p.target).length;
        return `${r.met ? "✓" : "✗"} ${passed}/${r.parts.length}`;
      },
      csv: (m) => {
        const r = targetById.get(m.governor_id);
        return r ? (r.met ? t.targets.csvMet : t.targets.csvMissed) : "-";
      },
    };

    // First stat columns, so "why did they miss?" is visible without scrolling the wide table.
    columns.unshift(overall, ...perMetric);
  }

  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key));

  const totals = useMemo(() => {
    return members.reduce(
      (acc, m) => {
        acc.power += m.power;
        acc.powerChange += m.power_change;
        acc.kill_t4 += m.kill_t4;
        acc.kill_t5 += m.kill_t5;
        acc.kp += m.kp_t4t5;
        acc.dead_t4 += m.dead_t4;
        acc.dead_t5 += m.dead_t5;
        acc.dead += m.dead_total;
        return acc;
      },
      { power: 0, powerChange: 0, kill_t4: 0, kill_t5: 0, kp: 0, dead_t4: 0, dead_t5: 0, dead: 0 }
    );
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searched = q
      ? members.filter(
          (m) => m.name.toLowerCase().includes(q) ||
            m.previous_name?.toLowerCase().includes(q) ||
            m.governor_id.includes(q)
        )
      : members;
    const rows =
      targetFilter === "all"
        ? searched
        : searched.filter((m) => {
            const r = targetById.get(m.governor_id);
            if (!r) return false;
            if (targetFilter === "met") return r.met;
            if (targetFilter === "missed") return !r.met;
            const p = partOf(r, targetFilter.slice("missed_".length) as TargetMetric);
            return p !== null && p.value < p.target;
          });

    // Target columns aren't member fields — sort by progress ratio, with no-requirement rows last.
    const valueOf = (m: ScoredMember) => {
      if (sortKey === "target") return targetById.get(m.governor_id)?.progress ?? -1;
      if (sortKey.startsWith("target_")) {
        const p = partOf(targetById.get(m.governor_id), sortKey.slice("target_".length) as TargetMetric);
        return p ? p.value / p.target : -1;
      }
      return m[sortKey as keyof ScoredMember];
    };
    return [...rows].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      // Target columns use -1 for "no target" — always last, either sort direction.
      if (sortKey.startsWith("target")) {
        const am = av === -1;
        const bm = bv === -1;
        if (am !== bm) return am ? 1 : -1;
      }
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [members, search, sortKey, sortDir, targetFilter, targetById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function toggleColumn(key: SortKey) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setAllColumns(hide: boolean) {
    setHiddenCols(hide ? new Set(columns.map((c) => c.key)) : new Set());
  }

  function handleExportCsv() {
    downloadCsv(
      `kvk-${menu.kingdomId}-${menu.startDate}-${menu.endDate}.csv`,
      [t.kvkSummary.governorId, t.kvkSummary.player, ...visibleColumns.map((c) => c.label)],
      filtered.map((m) => [m.governor_id, m.name, ...visibleColumns.map((c) => c.csv(m))])
    );
  }

  const paginationNav = (
    <Pagination
      page={currentPage}
      pageCount={pageCount}
      onChange={setPage}
      prevLabel={t.dashboard.prevPage}
      nextLabel={t.dashboard.nextPage}
      pageLabel={t.dashboard.pageIndicator}
    />
  );

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-none">
        <PageHeader
          title={menu.name}
          subtitle={`${t.common.kingdom} ${menu.kingdomId} · ${menu.startDate} — ${menu.endDate} · ${members.length} ${t.dashboard.players}`}
          action={
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/${menu.id}/analytics`}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                {t.analytics.open}
              </Link>
              <Link
                href={`/dashboard/${menu.id}/watchlist`}
                className="rounded-md border border-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                {t.watchlist.open}
              </Link>
              <Link
                href={`/kingdom/${menu.kingdomId}`}
                className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
              >
                {t.common.backToKvkList}
              </Link>
            </div>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <StatCard label={t.dashboard.totalPower} value={totals.power} theme="blue" icon="power" />
          <StatCard
            label={t.kvkSummary.powerChange}
            value={totals.powerChange}
            theme={totals.powerChange < 0 ? "red" : "emerald"}
            icon="trend"
            signed
          />
          <StatCard label={t.kvkSummary.t4Kills} value={totals.kill_t4} theme="cyan" icon="sword" />
          <StatCard label={t.kvkSummary.t5Kills} value={totals.kill_t5} theme="yellow" icon="sword" />
          <StatCard label={t.kvkSummary.kp} value={totals.kp} theme="fuchsia" icon="trophy" />
          <StatCard label={t.kvkSummary.deadT4} value={totals.dead_t4} theme="rose" icon="skull" />
          <StatCard label={t.kvkSummary.deadT5} value={totals.dead_t5} theme="orange" icon="skull" />
          <StatCard
            label={t.kvkSummary.deadT4T5}
            value={totals.dead_t4 + totals.dead_t5}
            theme="red"
            icon="skulls"
          />
          <StatCard label={t.kvkSummary.dead} value={totals.dead} theme="red" icon="skulls" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t.dashboard.searchPlaceholder}
            className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {targets.length > 0 && (
            <select
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value as typeof targetFilter);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">{t.targets.filterAll}</option>
              <option value="met">{t.targets.filterMet}</option>
              <option value="missed">{t.targets.filterMissed}</option>
              {metrics.map((metric) => (
                <option key={metric} value={`missed_${metric}`}>
                  {t.targets.filterMissedMetric[metric]}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ColumnToggle
              label={t.dashboard.columns}
              selectAllLabel={t.dashboard.selectAllColumns}
              columns={columns.map((c) => ({ key: c.key, label: c.label }))}
              hidden={hiddenCols}
              onToggle={toggleColumn}
              onSetAll={setAllColumns}
            />
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              {t.dashboard.exportCsv}
            </button>
          </div>
        </div>

        {/* Table — desktop / wide viewports */}
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th
                  onClick={() => handleSort("name")}
                  className="cursor-pointer select-none px-3 py-2 text-left hover:text-amber-600 dark:hover:text-amber-400"
                >
                  {t.kvkSummary.player}
                  {sortKey === "name" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="cursor-pointer select-none px-3 py-2 text-right hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginated.map((m, i) => (
                <tr key={m.governor_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2">
                    <RankBadge
                      rank={pageStart + i + 1}
                      showMedal={sortKey === "dkp" && sortDir === "desc"}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                    <PlayerLink governorId={m.governor_id} name={m.name} />
                    {m.previous_name && (
                      <div className="text-[11px] italic text-slate-500">{formatTemplate(t.common.formerly, { name: m.previous_name })}</div>
                    )}
                    <div className="text-[11px] text-slate-500">{m.governor_id}</div>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className={`px-3 py-2 text-right ${col.cellClassName(m)}`}>
                      {col.render(m)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="px-3 py-6 text-center text-slate-500">
                    {t.dashboard.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {paginationNav}
        </Card>

        {/* Cards — narrow viewports */}
        <div className="flex flex-col gap-3 md:hidden">
          {paginated.map((m, i) => (
            <Card key={m.governor_id} className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RankBadge
                    rank={pageStart + i + 1}
                    showMedal={sortKey === "dkp" && sortDir === "desc"}
                  /></div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">{t.kvkSummary.dkp}</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">{cell(m, fmt, m.dkp)}</div>
                </div>
              </div>
              <div className="mb-3">
                <PlayerLink
                  governorId={m.governor_id}
                  name={m.name}
                  size="touch"
                  note={m.previous_name ? formatTemplate(t.common.formerly, { name: m.previous_name }) : undefined}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {visibleColumns
                  .filter((c) => c.key !== "dkp")
                  .map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between gap-2 border-t border-slate-200 py-1 dark:border-slate-800/60"
                    >
                      <span className="text-slate-500">{col.label}</span>
                      <span className={col.cellClassName(m)}>{col.render(m)}</span>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-6 text-center text-slate-500">{t.dashboard.noResults}</Card>
          )}
          {filtered.length > 0 && <Card>{paginationNav}</Card>}
        </div>
      </PageContainer>
    </main>
  );
}

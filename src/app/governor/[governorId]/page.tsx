import Link from "next/link";
import { getGovernorBreakdown, getGovernorHistory, getNameHistory, getTargets, GovernorHistoryEntry } from "@/lib/data";
import { evaluateTarget } from "@/lib/targets";
import { getDictionary } from "@/lib/i18n/locale";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import GovernorCharts from "./GovernorCharts";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function fmtSigned(n: number) {
  return `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;
}

/** Every stat this governor has in one KvK — grouped so kills, dead and score read separately. */
function KvkDetail({ entry, t }: { entry: GovernorHistoryEntry; t: Dictionary }) {
  const g = t.governor;
  const m = entry.member;
  if (m.incomplete) {
    return (
      <Card className="mb-6 p-4 text-sm text-slate-500 dark:text-slate-400">
        {formatTemplate(g.incompleteNote, { kvk: entry.menu.name })}
      </Card>
    );
  }
  const tiers = [1, 2, 3, 4, 5] as const;
  const killsAll = tiers.reduce((s, n) => s + m[`kill_t${n}`], 0);
  const sections: { title: string; rows: [string, string, string?][] }[] = [
    {
      title: g.secPower,
      rows: [
        [g.powerStart, fmt(m.power_start)],
        [g.powerEnd, fmt(m.power)],
        [
          t.kvkSummary.powerChange,
          fmtSigned(m.power_change),
          m.power_change < 0 ? "text-red-600 dark:text-red-400" : m.power_change > 0 ? "text-emerald-600 dark:text-emerald-400" : "",
        ],
      ],
    },
    {
      title: g.secKills,
      rows: [
        ...tiers.map((n): [string, string] => [`T${n}`, fmt(m[`kill_t${n}`])]),
        [g.allTiers, fmt(killsAll)],
        [t.kvkSummary.kp, fmt(m.kp_t4t5), "font-bold"],
        [t.kvkSummary.kpTotal, fmt(m.total_kill_points)],
      ],
    },
    {
      title: g.secDead,
      rows: [
        ...tiers.map((n): [string, string] => [`T${n}`, fmt(m[`dead_t${n}`])]),
        [g.allTiers, fmt(m.dead_total)],
        [t.kvkSummary.deadT4T5, fmt(m.dead_t4t5), "font-bold"],
      ],
    },
    {
      title: g.secScore,
      rows: [
        [t.kvkSummary.dkp, fmt(m.dkp), "font-bold text-amber-600 dark:text-amber-400"],
        [g.rank, entry.rank ? `#${entry.rank} / ${entry.rankedCount}` : "-"],
        [g.resourcesGathered, fmt(m.resources_gathered)],
        [g.allianceHelp, fmt(m.alliance_help)],
      ],
    },
  ];
  return (
    <Card className="mb-6 p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        {formatTemplate(g.detailTitle, { kvk: entry.menu.name })}
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{g.detailSub}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((sec) => (
          <div key={sec.title} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{sec.title}</div>
            <dl className="flex flex-col gap-1 text-sm">
              {sec.rows.map(([label, value, cls]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className={`tabular-nums ${cls?.includes("text-") ? cls : `text-slate-900 dark:text-white ${cls ?? ""}`}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** One governor's results across every KvK menu (any kingdom) they appear in. */
export default async function GovernorPage({
  params,
  searchParams,
}: {
  params: Promise<{ governorId: string }>;
  searchParams: Promise<{ kvk?: string | string[] }>;
}) {
  const [{ governorId: rawId }, { kvk }] = await Promise.all([params, searchParams]);
  const governorId = decodeURIComponent(rawId);
  const [history, names, { t }] = await Promise.all([
    getGovernorHistory(governorId),
    getNameHistory(governorId),
    getDictionary(),
  ]);

  // Per-KvK charts show one KvK at a time: ?kvk=<menuId>, else the newest one.
  const requestedKvk = Array.isArray(kvk) ? kvk[0] : kvk;
  const selected = history.find((h) => h.menu.id === requestedKvk) ?? history[0];
  const [breakdown, targets] = selected
    ? await Promise.all([getGovernorBreakdown(selected.menu, governorId), getTargets(selected.menu.kingdomId)])
    : [null, []];
  const target = breakdown ? evaluateTarget(breakdown.member, targets) : null;
  const trend = [...history].reverse().map((h) => ({
    key: h.menu.id,
    label: h.menu.name,
    dkp: h.member.dkp,
    incomplete: h.member.incomplete,
  }));

  const name = history[0]?.member.name ?? governorId;
  const complete = history.filter((h) => !h.member.incomplete);
  const totals = complete.reduce(
    (acc, h) => ({
      dkp: acc.dkp + h.member.dkp,
      kp: acc.kp + h.member.kp_t4t5,
      dead: acc.dead + h.member.dead_total,
    }),
    { dkp: 0, kp: 0, dead: 0 }
  );

  const summary = [
    { label: t.governor.kvkCount, value: fmt(history.length) },
    { label: t.governor.totalDkp, value: fmt(totals.dkp) },
    { label: t.governor.totalKp, value: fmt(totals.kp) },
    { label: t.governor.totalDead, value: fmt(totals.dead) },
  ];

  return (
    <main className="flex-1">
      <PageContainer>
        <PageHeader
          title={name}
          subtitle={formatTemplate(t.governor.subtitle, { id: governorId })}
          action={
            <div className="flex items-center gap-4">
              {selected && (
                <Link
                  href={`/players/compare?kvk=${selected.menu.id}&a=${encodeURIComponent(governorId)}`}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                >
                  {t.playerCompare.open}
                </Link>
              )}
              <Link
                href="/"
                className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
              >
                {t.common.backHome}
              </Link>
            </div>
          }
        />

        {history.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.governor.empty}</Card>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {summary.map((s) => (
                <Card key={s.label} className="p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                  <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                </Card>
              ))}
            </div>

            {names.length > 1 ? (
              <Card className="mb-6 p-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t.governor.namesTitle}</h2>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.governor.namesSub}</p>
                <ol className="flex flex-wrap items-center gap-2 text-sm">
                  {names.map((n, i) => (
                    <li key={`${n.name}-${n.from}`} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden className="text-slate-400">→</span>}
                      <span className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
                        <span className="font-semibold text-slate-900 dark:text-white">{n.name}</span>
                        <span className="ml-2 text-[11px] text-slate-500">
                          {n.from === n.to ? n.from : `${n.from} – ${n.to}`}
                          {i === names.length - 1 && ` · ${t.governor.nameCurrent}`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : (
              names.length === 1 && (
                <p className="-mt-3 mb-4 text-xs text-slate-500 dark:text-slate-400">
                  {formatTemplate(t.governor.nameSingle, { from: names[0].from })}
                </p>
              )
            )}

            {/* Which KvK everything below is about — shown even with a single KvK */}
            <Card className="mb-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.governor.viewingTitle}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{selected.menu.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.common.kingdom} {selected.menu.kingdomId} · {selected.menu.startDate} — {selected.menu.endDate}
                  </div>
                </div>
                <Link
                  href={`/dashboard/${selected.menu.id}`}
                  className="text-sm text-amber-600 hover:underline dark:text-amber-400"
                >
                  {t.governor.openDashboard}
                </Link>
              </div>
              {history.length > 1 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.governor.pickKvk}</span>
                  {history.map((h) => (
                    <Link
                      key={h.menu.id}
                      href={`/governor/${encodeURIComponent(governorId)}?kvk=${h.menu.id}`}
                      scroll={false}
                      className={
                        h.menu.id === selected.menu.id
                          ? "rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950"
                          : "rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      }
                    >
                      {h.menu.name}
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <KvkDetail entry={selected} t={t} />

            <GovernorCharts breakdown={breakdown} target={target} kvkName={selected.menu.name} trend={trend} t={t} />

            <Card className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">{t.governor.kvk}</th>
                    <th className="px-3 py-2 text-left">{t.common.kingdom}</th>
                    <th className="px-3 py-2 text-right">{t.governor.rank}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.power}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.powerChange}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.kp}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.dead}</th>
                    <th className="px-3 py-2 text-right">{t.kvkSummary.dkp}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {history.map(({ menu, member, rank, rankedCount }) => {
                    const dash = member.incomplete;
                    return (
                      <tr
                        key={menu.id}
                        className={
                          menu.id === selected.menu.id
                            ? "bg-amber-50 dark:bg-amber-950/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          <Link
                            href={`/governor/${encodeURIComponent(governorId)}?kvk=${menu.id}`}
                            scroll={false}
                            title={t.governor.selectHint}
                            className="font-medium text-slate-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400"
                          >
                            {menu.name}
                          </Link>
                          <div className="text-[11px] text-slate-500">
                            {menu.startDate} — {menu.endDate}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{menu.kingdomId}</td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                          {rank ? `#${rank} / ${rankedCount}` : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">{fmt(member.power)}</td>
                        <td
                          className={`px-3 py-2 text-right ${
                            dash
                              ? ""
                              : member.power_change < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {dash ? "-" : fmtSigned(member.power_change)}
                        </td>
                        <td className="px-3 py-2 text-right">{dash ? "-" : fmt(member.kp_t4t5)}</td>
                        <td className="px-3 py-2 text-right">{dash ? "-" : fmt(member.dead_total)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {dash ? "-" : fmt(member.dkp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </PageContainer>
    </main>
  );
}

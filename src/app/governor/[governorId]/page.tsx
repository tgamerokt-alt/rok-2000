import Link from "next/link";
import { getGovernorHistory } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import { formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function fmtSigned(n: number) {
  return `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;
}

/** One governor's results across every KvK menu (any kingdom) they appear in. */
export default async function GovernorPage({ params }: { params: Promise<{ governorId: string }> }) {
  const { governorId } = await params;
  const [history, { t }] = await Promise.all([getGovernorHistory(decodeURIComponent(governorId)), getDictionary()]);

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
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
            >
              {t.common.backHome}
            </Link>
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

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
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
                      <tr key={menu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2">
                          <Link
                            href={`/dashboard/${menu.id}`}
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { styleForTeam } from "@/lib/campaignColors";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

export interface CompareKdRow {
  kingdomId: string;
  power: number;
  dead_total: number;
  total_kill_points: number;
  /** T4+T5 kills for this KvK — "latest KvK kills". */
  kp: number;
  /** Formula-weighted score, summed into the team's Trophy total. */
  dkp: number;
  hasData: boolean;
}

export interface CompareTeam {
  id: string;
  name: string;
  rows: CompareKdRow[];
}

export interface CompareCampaign {
  id: string;
  name: string;
  code: string;
  teams: CompareTeam[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

// Tailwind needs literal class names to pick them up — can't interpolate `lg:grid-cols-${n}`.
const TEAM_GRID_COLS_CLASS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

function CampaignModal({
  campaign,
  onClose,
  t,
}: {
  campaign: CompareCampaign;
  onClose: () => void;
  t: Dictionary;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative my-8 w-full max-w-7xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{campaign.name}</h2>
            {campaign.code && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{campaign.code}</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {campaign.teams.length === 0 ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t.compare.noTeams}</p>
          ) : (
            (() => {
              const teamCount = campaign.teams.length;
              // At most 2 rows: 2 teams sit side by side, 4 teams sit 2-over-2, 6 sit 3-over-3, etc.
              const gridRows = teamCount <= 2 ? 1 : 2;
              const gridCols = Math.min(Math.max(Math.ceil(teamCount / gridRows), 1), 6);
              const compact = gridCols >= 3;
              const cellPad = compact ? "px-1.5 py-1" : "px-3 py-1.5";
              const tableTextClass = compact ? "text-[11px]" : "text-sm";

              return (
                <div className={`grid grid-cols-1 gap-4 ${TEAM_GRID_COLS_CLASS[gridCols]}`}>
                  {campaign.teams.map((team, index) => {
                    const styles = styleForTeam(team.name, index);
                    const ranked = [...team.rows].sort((a, b) => b.total_kill_points - a.total_kill_points);
                    return (
                      <Card key={team.id} className={`overflow-hidden border ${styles.border}`}>
                        <div className={`flex items-center justify-between px-4 py-2.5 ${styles.header}`}>
                          <span className={`text-sm font-bold ${styles.text}`}>{team.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
                            {team.rows.length}
                          </span>
                        </div>
                        {ranked.length === 0 ? (
                          <p className="px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                            {t.compare.noKingdoms}
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className={`w-full table-fixed ${tableTextClass}`}>
                              <colgroup>
                                <col style={{ width: "24%" }} />
                                <col style={{ width: "19%" }} />
                                <col style={{ width: "19%" }} />
                                <col style={{ width: "19%" }} />
                                <col style={{ width: "19%" }} />
                              </colgroup>
                              <thead className="text-slate-500 dark:text-slate-400">
                                <tr>
                                  <th className={`${cellPad} text-left font-medium`}>{t.compare.kd}</th>
                                  <th className={`${cellPad} text-right font-medium`}>{t.compare.power}</th>
                                  <th className={`${cellPad} text-right font-medium`}>{t.compare.dead}</th>
                                  <th className={`${cellPad} text-right font-medium`}>{t.compare.killScore}</th>
                                  <th className={`${cellPad} text-right font-medium`}>{t.compare.latestKills}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {ranked.map((row, rowIndex) => (
                                  <tr key={row.kingdomId}>
                                    <td className={`${cellPad} font-semibold text-slate-900 dark:text-white`}>
                                      <span className="text-slate-400 dark:text-slate-500">{rowIndex + 1}.</span>{" "}
                                      {row.kingdomId}
                                    </td>
                                    <td className={`${cellPad} text-right text-blue-700 dark:text-blue-300`}>
                                      {row.hasData ? fmt(row.power) : t.compare.noData}
                                    </td>
                                    <td className={`${cellPad} text-right text-red-700 dark:text-red-300`}>
                                      {row.hasData ? fmt(row.dead_total) : t.compare.noData}
                                    </td>
                                    <td className={`${cellPad} text-right text-amber-700 dark:text-amber-400`}>
                                      {row.hasData ? fmt(row.total_kill_points) : t.compare.noData}
                                    </td>
                                    <td className={`${cellPad} text-right text-fuchsia-700 dark:text-fuchsia-300`}>
                                      {row.hasData ? fmt(row.kp) : t.compare.noData}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold dark:border-slate-700 dark:bg-slate-800/50">
                                <tr>
                                  <td className={`${cellPad} text-slate-700 dark:text-slate-200`}>{t.compare.total}</td>
                                  <td className={`${cellPad} text-right text-blue-700 dark:text-blue-300`}>
                                    {fmt(team.rows.reduce((sum, r) => sum + r.power, 0))}
                                  </td>
                                  <td className={`${cellPad} text-right text-red-700 dark:text-red-300`}>
                                    {fmt(team.rows.reduce((sum, r) => sum + r.dead_total, 0))}
                                  </td>
                                  <td className={`${cellPad} text-right text-amber-700 dark:text-amber-400`}>
                                    {fmt(team.rows.reduce((sum, r) => sum + r.total_kill_points, 0))}
                                  </td>
                                  <td className={`${cellPad} text-right text-fuchsia-700 dark:text-fuchsia-300`}>
                                    {fmt(team.rows.reduce((sum, r) => sum + r.kp, 0))}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompareClient({
  campaigns,
  t,
}: {
  campaigns: CompareCampaign[];
  t: Dictionary;
}) {
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const openCampaign = campaigns.find((c) => c.id === openCampaignId) ?? null;

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-3xl">
        <PageHeader
          title={t.compare.title}
          subtitle={t.compare.subtitle}
          action={
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
            >
              {t.common.backHome}
            </Link>
          }
        />

        {campaigns.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.compare.empty}</Card>
        ) : (
          <Card className="divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
            {campaigns.map((campaign) => {
              const kingdomCount = campaign.teams.reduce((sum, team) => sum + team.rows.length, 0);
              return (
                <button
                  key={campaign.id}
                  onClick={() => setOpenCampaignId(campaign.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
                      {campaign.name}
                      {campaign.code && (
                        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                          {campaign.code}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTemplate(t.compare.kingdomsCount, { count: String(kingdomCount) })}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t.compare.viewRanking}
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
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </Card>
        )}
      </PageContainer>

      {openCampaign && (
        <CampaignModal campaign={openCampaign} onClose={() => setOpenCampaignId(null)} t={t} />
      )}
    </main>
  );
}

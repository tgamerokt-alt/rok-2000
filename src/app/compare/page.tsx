import { getLatestMenuForKingdom, getManualKingdomStat, getScoredMembers, listCampaigns } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import { Campaign } from "@/lib/types";
import CompareClient, { CompareCampaign, CompareKdRow } from "./CompareClient";

export const dynamic = "force-dynamic";

async function buildCampaignRows(campaign: Campaign): Promise<CompareCampaign> {
  const teams = await Promise.all(
    campaign.teams.map(async (team) => {
      const rows = await Promise.all(
        team.kingdomIds.map(async (kingdomId): Promise<CompareKdRow> => {
          const [menu, manual] = await Promise.all([
            getLatestMenuForKingdom(kingdomId),
            getManualKingdomStat(kingdomId),
          ]);

          // When both a real xlsx snapshot and a manually-entered stat exist for
          // the same kingdom, use whichever was updated more recently — not
          // xlsx unconditionally — so re-entering fresher manual numbers (or
          // re-uploading a newer xlsx) actually takes effect on this page.
          const menuTime = menu ? new Date(menu.updatedAt).getTime() : -Infinity;
          const manualTime = manual ? new Date(manual.updatedAt).getTime() : -Infinity;

          if (menu && menuTime >= manualTime) {
            const members = await getScoredMembers(menu);
            const totals = members.reduce(
              (acc, m) => {
                acc.power += m.power;
                acc.dead_total += m.dead_total;
                acc.total_kill_points += m.total_kill_points;
                acc.kp += m.kp_t4t5;
                acc.dkp += m.dkp;
                return acc;
              },
              { power: 0, dead_total: 0, total_kill_points: 0, kp: 0, dkp: 0 }
            );
            return { kingdomId, ...totals, hasData: true };
          }
          if (manual) {
            return {
              kingdomId,
              power: manual.power,
              dead_total: manual.dead_total,
              total_kill_points: manual.total_kill_points,
              kp: manual.latest_kvk_kills,
              dkp: manual.total_kill_points,
              hasData: true,
            };
          }
          return { kingdomId, power: 0, dead_total: 0, total_kill_points: 0, kp: 0, dkp: 0, hasData: false };
        })
      );
      return { id: team.id, name: team.name, rows };
    })
  );

  return { id: campaign.id, name: campaign.name, code: campaign.code, teams };
}

export default async function ComparePage() {
  const campaigns = await listCampaigns();
  const { t } = await getDictionary();
  const compareCampaigns = await Promise.all(campaigns.map(buildCampaignRows));

  return <CompareClient campaigns={compareCampaigns} t={t} />;
}

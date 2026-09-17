import { getLatestMenuForKingdom, listCampaigns, listManualKingdomStats } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import KingdomsClient from "./KingdomsClient";

export const dynamic = "force-dynamic";

export default async function KingdomsPage() {
  const [campaigns, manualStats] = await Promise.all([listCampaigns(), listManualKingdomStats()]);

  // /compare uses whichever of (real xlsx snapshot, manually-entered stat) was
  // updated more recently when both exist for the same kingdom — compute the
  // same comparison here so the admin UI can show which one is currently
  // winning, instead of assuming xlsx always wins.
  const kingdomIds = new Set<string>();
  for (const campaign of campaigns) {
    for (const team of campaign.teams) {
      for (const kingdomId of team.kingdomIds) kingdomIds.add(kingdomId);
    }
  }
  const hasXlsxData: Record<string, boolean> = {};
  const xlsxWins: Record<string, boolean> = {};
  await Promise.all(
    [...kingdomIds].map(async (kingdomId) => {
      const menu = await getLatestMenuForKingdom(kingdomId);
      hasXlsxData[kingdomId] = menu !== null;
      if (!menu) return;
      const manual = manualStats[kingdomId];
      const menuTime = new Date(menu.updatedAt).getTime();
      const manualTime = manual ? new Date(manual.updatedAt).getTime() : -Infinity;
      xlsxWins[kingdomId] = menuTime >= manualTime;
    })
  );

  const { t, locale } = await getDictionary();
  return (
    <KingdomsClient
      campaigns={campaigns}
      manualStats={manualStats}
      hasXlsxData={hasXlsxData}
      xlsxWins={xlsxWins}
      t={t}
      locale={locale}
    />
  );
}

import { notFound } from "next/navigation";
import { getKvkMenu, getScoredMembers, getTargets, listKvkMenus } from "@/lib/data";
import { evaluateTarget } from "@/lib/targets";
import { getDictionary } from "@/lib/i18n/locale";
import WatchlistClient from "./WatchlistClient";

export const dynamic = "force-dynamic";

export default async function WatchlistPage({ params }: { params: Promise<{ kvkId: string }> }) {
  const { kvkId } = await params;
  const menu = await getKvkMenu(kvkId);
  if (!menu) notFound();

  const [members, targets, kingdomMenus, { t }] = await Promise.all([
    getScoredMembers(menu),
    getTargets(menu.kingdomId),
    listKvkMenus(menu.kingdomId),
    getDictionary(),
  ]);

  // "Missed the target N KvKs in a row": walk this kingdom's KvKs newest → oldest,
  // starting at this one, counting consecutive misses per governor. Targets are
  // per kingdom (not per KvK), so the current targets are applied to every KvK.
  const chronological = kingdomMenus
    .filter((m) => m.startDate <= menu.startDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const streaks: Record<string, number> = {};
  if (targets.length > 0 && chronological.length >= 2) {
    const scored = await Promise.all(chronological.map((m) => getScoredMembers(m).catch(() => [])));
    const alive = new Set(members.map((m) => m.governor_id));
    scored.forEach((list) => {
      const byId = new Map(list.map((m) => [m.governor_id, m]));
      for (const id of alive) {
        const m = byId.get(id);
        const r = m ? evaluateTarget(m, targets) : null;
        if (r && !r.met) streaks[id] = (streaks[id] ?? 0) + 1;
        else alive.delete(id); // streak broken (met, exempt, or absent)
      }
    });
  }

  return (
    <WatchlistClient
      menu={menu}
      members={members}
      targets={targets}
      streaks={streaks}
      kvkCount={chronological.length}
      t={t}
    />
  );
}

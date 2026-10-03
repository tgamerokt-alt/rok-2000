import { notFound } from "next/navigation";
import { getKvkMenu, getScoredMembers, getTargets } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: Promise<{ kvkId: string }> }) {
  const { kvkId } = await params;
  const menu = await getKvkMenu(kvkId);
  if (!menu) notFound();

  const [members, targets, { t }] = await Promise.all([
    getScoredMembers(menu),
    getTargets(menu.kingdomId),
    getDictionary(),
  ]);
  return <AnalyticsClient menu={menu} members={members} targets={targets} t={t} />;
}

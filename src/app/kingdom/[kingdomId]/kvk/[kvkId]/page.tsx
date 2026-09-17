import { notFound } from "next/navigation";
import { getKvkMenu, getScoredMembers } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import KvkSummaryClient from "./KvkSummaryClient";

export const dynamic = "force-dynamic";

export default async function KvkSummaryPage({
  params,
}: {
  params: Promise<{ kingdomId: string; kvkId: string }>;
}) {
  const { kingdomId, kvkId } = await params;
  const menu = await getKvkMenu(kvkId);
  if (!menu || menu.kingdomId !== kingdomId) notFound();

  const members = await getScoredMembers(menu);
  const { t } = await getDictionary();

  return <KvkSummaryClient menu={menu} members={members} t={t} />;
}

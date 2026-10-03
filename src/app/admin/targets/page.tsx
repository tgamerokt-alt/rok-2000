import { getTargets, listKvkMenus } from "@/lib/data";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/locale";
import TargetsForm from "./TargetsForm";

export const dynamic = "force-dynamic";

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ kingdom?: string | string[] }>;
}) {
  const { kingdom } = await searchParams;
  const requested = (Array.isArray(kingdom) ? kingdom[0] : kingdom)?.trim() || "";
  const kingdomId = /^\d{1,6}$/.test(requested) ? requested : PRIMARY_KINGDOM_ID;

  const [brackets, menus, { t }] = await Promise.all([getTargets(kingdomId), listKvkMenus(), getDictionary()]);

  const others = [...new Set(menus.map((m) => m.kingdomId))]
    .filter((id) => id !== PRIMARY_KINGDOM_ID)
    .sort((a, b) => Number(a) - Number(b));
  const kingdomIds = [...new Set([PRIMARY_KINGDOM_ID, ...others, kingdomId])];

  return <TargetsForm key={kingdomId} kingdomId={kingdomId} kingdomIds={kingdomIds} brackets={brackets} t={t} />;
}

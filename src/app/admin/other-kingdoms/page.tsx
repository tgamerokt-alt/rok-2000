import { listKingdoms, listKvkMenus } from "@/lib/data";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/locale";
import AdminMenusClient from "../AdminMenusClient";

export const dynamic = "force-dynamic";

// Same KvK-menu management as /admin, but for every kingdom other than the
// primary one (2000), picked via ?kingdom=<id>.
export default async function AdminOtherKingdomsPage({
  searchParams,
}: {
  searchParams: Promise<{ kingdom?: string | string[] }>;
}) {
  const { kingdom } = await searchParams;
  const requested = (Array.isArray(kingdom) ? kingdom[0] : kingdom)?.trim() || "";

  const [allMenus, kingdoms, { t, locale }] = await Promise.all([listKvkMenus(), listKingdoms(), getDictionary()]);

  const withMenus = [...new Set(allMenus.map((m) => m.kingdomId))].filter((id) => id !== PRIMARY_KINGDOM_ID);
  const valid = /^\d{1,6}$/.test(requested) && requested !== PRIMARY_KINGDOM_ID;
  // No (valid) selection yet → fall back to the first kingdom that already has menus.
  const kingdomId = valid ? requested : withMenus.sort((a, b) => Number(a) - Number(b))[0] ?? null;

  const byId = (a: string, b: string) => Number(a) - Number(b);
  const kingdomIds = [...new Set([...withMenus, ...(kingdomId ? [kingdomId] : [])])].sort(byId);
  // Suggestions only — the create form's Kingdom ID field accepts any ID.
  const suggestions = [...new Set([...withMenus, ...kingdoms.map((k) => k.id)])]
    .filter((id) => id !== PRIMARY_KINGDOM_ID)
    .sort(byId);
  const menus = kingdomId ? allMenus.filter((m) => m.kingdomId === kingdomId) : [];

  return (
    <AdminMenusClient
      kingdomId={kingdomId}
      picker={{ basePath: "/admin/other-kingdoms", kingdomIds, suggestions, excludeId: PRIMARY_KINGDOM_ID }}
      menus={menus}
      t={t}
      locale={locale}
    />
  );
}

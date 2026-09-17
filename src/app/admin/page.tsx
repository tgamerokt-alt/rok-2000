import { listKvkMenus } from "@/lib/data";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/locale";
import AdminMenusClient from "./AdminMenusClient";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const menus = await listKvkMenus(PRIMARY_KINGDOM_ID);
  const { t, locale } = await getDictionary();
  return <AdminMenusClient kingdomId={PRIMARY_KINGDOM_ID} menus={menus} t={t} locale={locale} />;
}

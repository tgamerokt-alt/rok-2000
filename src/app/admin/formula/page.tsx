import { getFormula, hasCustomFormula, listKvkMenus } from "@/lib/data";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/locale";
import FormulaForm from "./FormulaForm";

export const dynamic = "force-dynamic";

export default async function FormulaPage({
  searchParams,
}: {
  searchParams: Promise<{ kingdom?: string | string[] }>;
}) {
  const { kingdom } = await searchParams;
  const requested = (Array.isArray(kingdom) ? kingdom[0] : kingdom)?.trim() || "";
  const kingdomId = /^\d{1,6}$/.test(requested) ? requested : PRIMARY_KINGDOM_ID;

  const [formula, isCustom, menus, { t }] = await Promise.all([
    getFormula(kingdomId),
    hasCustomFormula(kingdomId),
    listKvkMenus(),
    getDictionary(),
  ]);

  // Primary kingdom first, then every other kingdom that has KvK menus (the ones DKP is shown for).
  const others = [...new Set(menus.map((m) => m.kingdomId))]
    .filter((id) => id !== PRIMARY_KINGDOM_ID)
    .sort((a, b) => Number(a) - Number(b));
  const kingdomIds = [...new Set([PRIMARY_KINGDOM_ID, ...others, kingdomId])];

  return (
    <FormulaForm
      key={kingdomId}
      kingdomId={kingdomId}
      kingdomIds={kingdomIds}
      isCustom={isCustom}
      formula={formula}
      t={t}
    />
  );
}

import { getFormula } from "@/lib/data";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/locale";
import FormulaForm from "./FormulaForm";

export const dynamic = "force-dynamic";

export default async function FormulaPage() {
  const formula = await getFormula(PRIMARY_KINGDOM_ID);
  const { t } = await getDictionary();
  return <FormulaForm kingdomId={PRIMARY_KINGDOM_ID} formula={formula} t={t} />;
}

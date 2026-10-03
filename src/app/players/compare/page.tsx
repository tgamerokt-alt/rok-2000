import { getFormula, getScoredMembers, getTargets, listKvkMenus } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import PlayerCompareClient from "./PlayerCompareClient";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Side-by-side comparison of two governors within one KvK (?kvk=<menuId>&a=<id>&b=<id>). */
export default async function PlayerComparePage({
  searchParams,
}: {
  searchParams: Promise<{ kvk?: string | string[]; a?: string | string[]; b?: string | string[] }>;
}) {
  const sp = await searchParams;
  const [menus, { t }] = await Promise.all([listKvkMenus(), getDictionary()]);

  if (menus.length === 0) {
    return (
      <main className="flex-1">
        <PageContainer>
          <PageHeader title={t.playerCompare.title} subtitle={t.playerCompare.subtitle} />
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.playerCompare.noKvk}</Card>
        </PageContainer>
      </main>
    );
  }

  // Same KvK for both players, so the time window and DKP formula are identical.
  const menu = menus.find((m) => m.id === first(sp.kvk)) ?? menus[0];
  const [members, formula, targets] = await Promise.all([
    getScoredMembers(menu),
    getFormula(menu.kingdomId),
    getTargets(menu.kingdomId),
  ]);

  return (
    <PlayerCompareClient
      menus={menus.map((m) => ({ id: m.id, name: m.name, kingdomId: m.kingdomId }))}
      menu={menu}
      members={members}
      formula={formula}
      targets={targets}
      initialA={first(sp.a)}
      initialB={first(sp.b)}
      t={t}
    />
  );
}

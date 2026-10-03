import { listOtherKingdomsWithMenus } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { KingdomGrid } from "@/components/KingdomGrid";

export const dynamic = "force-dynamic";

// Public index of every kingdom other than the primary one — the single sidebar
// entry point for them, so the nav doesn't grow by one link per kingdom.
export default async function KingdomsIndexPage() {
  const [kingdoms, { t }] = await Promise.all([listOtherKingdomsWithMenus(), getDictionary()]);

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-4xl">
        <PageHeader title={t.kingdomsIndex.title} subtitle={t.kingdomsIndex.subtitle} />
        {kingdoms.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.kingdomsIndex.empty}</Card>
        ) : (
          <KingdomGrid kingdoms={kingdoms} t={t} searchable />
        )}
      </PageContainer>
    </main>
  );
}

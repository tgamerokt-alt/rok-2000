import Link from "next/link";
import { listKvkMenus } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/locale";
import { formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function KingdomPage({
  params,
}: {
  params: Promise<{ kingdomId: string }>;
}) {
  const { kingdomId } = await params;
  const menus = await listKvkMenus(kingdomId);
  const { t } = await getDictionary();

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-3xl">
        <PageHeader
          title={formatTemplate(t.kingdomList.title, { id: kingdomId })}
          action={
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
            >
              {t.common.backHome}
            </Link>
          }
        />

        {menus.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.kingdomList.empty}</Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {menus.map((menu) => (
              <li key={menu.id}>
                <Card className="px-4 py-3 transition hover:border-amber-500/70">
                  <Link
                    href={`/kingdom/${kingdomId}/kvk/${menu.id}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{menu.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {menu.startDate} — {menu.endDate}
                      </div>
                    </div>
                    <span className="text-amber-600 dark:text-amber-400">{t.kingdomList.viewSummary}</span>
                  </Link>
                  <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                    <Link
                      href={`/dashboard/${menu.id}`}
                      className="text-xs text-slate-500 underline hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      {t.kingdomList.openFullDashboard}
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </main>
  );
}

export function generateMetadata() {
  return { title: "Kingdom KvK list" };
}

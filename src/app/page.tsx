import Link from "next/link";
import { listKingdoms, listOtherKingdomsWithMenus } from "@/lib/data";
import { KingdomGrid } from "@/components/KingdomGrid";
import { PRIMARY_KINGDOM_ID } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/locale";
import { formatTemplate } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const HOME_KINGDOM_LIMIT = 8;

export default async function HomePage() {
  const [kingdoms, others, { t }] = await Promise.all([listKingdoms(), listOtherKingdomsWithMenus(), getDictionary()]);
  const primary = kingdoms.find((k) => k.id === PRIMARY_KINGDOM_ID);

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{t.common.siteTitle}</h1>
      {primary ? (
        <Link
          href={`/kingdom/${primary.id}`}
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/50 transition hover:border-amber-500 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/30 dark:hover:bg-slate-800"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400">{t.common.kingdom}</div>
          <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{primary.id}</div>
          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">{t.home.viewKvkList}</div>
        </Link>
      ) : (
        <p className="text-slate-500 dark:text-slate-400">{t.home.noPrimaryKingdom}</p>
      )}
      {others.length > 0 && (
        <section className="w-full max-w-3xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.home.otherKingdoms}</h2>
            {others.length > HOME_KINGDOM_LIMIT && (
              <Link href="/kingdoms" className="text-sm text-amber-600 hover:underline dark:text-amber-400">
                {formatTemplate(t.home.viewAllKingdoms, { count: String(others.length) })}
              </Link>
            )}
          </div>
          <KingdomGrid kingdoms={others.slice(0, HOME_KINGDOM_LIMIT)} t={t} />
        </section>
      )}
      <Link
        href="/compare"
        className="text-sm text-slate-500 underline hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
      >
        {t.common.compareKingdoms}
      </Link>
    </main>
  );
}

import Link from "next/link";
import { getScoredMembers, getTargets, listKvkMenus } from "@/lib/data";
import { ScoredMember } from "@/lib/dkp";
import { evaluateTarget } from "@/lib/targets";
import { getDictionary } from "@/lib/i18n/locale";
import { formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import KvkCompareClient, { KvkSummary, PlayerDelta } from "./KvkCompareClient";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function median(values: number[]) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Kingdom-level aggregates for one KvK, computed only from complete rows. */
function summarize(members: ScoredMember[], targets: Parameters<typeof evaluateTarget>[1]): KvkSummary {
  const complete = members.filter((m) => !m.incomplete);
  const fought = complete.filter((m) => m.dkp > 0);
  const totalDkp = complete.reduce((s, m) => s + m.dkp, 0);
  const top10 = [...complete].sort((a, b) => b.dkp - a.dkp).slice(0, 10).reduce((s, m) => s + m.dkp, 0);
  const results = complete.map((m) => evaluateTarget(m, targets)).filter((r) => r !== null);
  return {
    players: complete.length,
    participation: complete.length ? fought.length / complete.length : 0,
    totalDkp,
    totalKills: complete.reduce((s, m) => s + m.kp_t4t5, 0),
    totalDead: complete.reduce((s, m) => s + m.dead_t4t5, 0),
    totalPowerChange: complete.reduce((s, m) => s + m.power_change, 0),
    medianDkp: median(fought.map((m) => m.dkp)),
    top10Share: totalDkp ? top10 / totalDkp : 0,
    targetPass: results.length ? results.filter((r) => r.met).length / results.length : null,
  };
}

/** Compare two KvKs of the same kingdom (?a=<older menuId>&b=<newer menuId>). */
export default async function KingdomKvkComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ kingdomId: string }>;
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}) {
  const [{ kingdomId }, sp] = await Promise.all([params, searchParams]);
  const [menus, targets, { t }] = await Promise.all([listKvkMenus(kingdomId), getTargets(kingdomId), getDictionary()]);
  const c = t.kvkCompare;

  const header = (
    <PageHeader
      title={formatTemplate(c.title, { id: kingdomId })}
      subtitle={c.subtitle}
      action={
        <Link
          href={`/kingdom/${kingdomId}`}
          className="text-sm text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
        >
          {t.common.backToKvkList}
        </Link>
      }
    />
  );

  if (menus.length === 0) {
    return (
      <main className="flex-1">
        <PageContainer>
          {header}
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.kingdomList.empty}</Card>
        </PageContainer>
      </main>
    );
  }

  // Defaults: previous KvK (A) vs newest (B). listKvkMenus is newest-first.
  const menuA = menus.find((m) => m.id === first(sp.a)) ?? menus[1] ?? menus[0];
  const menuB = menus.find((m) => m.id === first(sp.b)) ?? menus[0];
  const [membersA, membersB] = await Promise.all([getScoredMembers(menuA), getScoredMembers(menuB)]);

  const byIdA = new Map(membersA.filter((m) => !m.incomplete).map((m) => [m.governor_id, m]));
  const byIdB = new Map(membersB.filter((m) => !m.incomplete).map((m) => [m.governor_id, m]));
  const returning: PlayerDelta[] = [...byIdB.values()]
    .filter((m) => byIdA.has(m.governor_id))
    .map((m) => ({ id: m.governor_id, name: m.name, dkpA: byIdA.get(m.governor_id)!.dkp, dkpB: m.dkp }));

  return (
    <KvkCompareClient
      kingdomId={kingdomId}
      menus={menus.map((m) => ({ id: m.id, name: m.name, startDate: m.startDate }))}
      menuA={{ id: menuA.id, name: menuA.name }}
      menuB={{ id: menuB.id, name: menuB.name }}
      a={summarize(membersA, targets)}
      b={summarize(membersB, targets)}
      returning={returning}
      newCount={[...byIdB.keys()].filter((id) => !byIdA.has(id)).length}
      leftCount={[...byIdA.keys()].filter((id) => !byIdB.has(id)).length}
      t={t}
    />
  );
}

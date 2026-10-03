import { readDbSnapshot } from "./db";
import { kvkFileName } from "./storage";
import { readBlobFile } from "./blobStorage";
import { diffSnapshots, ScoredMember, scoreMembers } from "./dkp";
import { DEFAULT_DKP_FORMULA, DkpFormula, KvkMenu, ManualKingdomStat, MemberStat, PRIMARY_KINGDOM_ID, TargetBracket } from "./types";

export async function getFormula(kingdomId: string): Promise<DkpFormula> {
  const db = await readDbSnapshot();
  return db.formulas[kingdomId] || DEFAULT_DKP_FORMULA;
}

export async function listKvkMenus(kingdomId?: string): Promise<KvkMenu[]> {
  const db = await readDbSnapshot();
  const menus = kingdomId ? db.kvkMenus.filter((m) => m.kingdomId === kingdomId) : db.kvkMenus;
  return [...menus].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function getKvkMenu(menuId: string): Promise<KvkMenu | null> {
  const db = await readDbSnapshot();
  return db.kvkMenus.find((m) => m.id === menuId) || null;
}

export async function getScoredMembers(menu: KvkMenu) {
  const [beforeBuffer, afterBuffer] = await Promise.all([
    readBlobFile(kvkFileName(menu.kingdomId, menu.beforeFileName)),
    readBlobFile(kvkFileName(menu.kingdomId, menu.afterFileName)),
  ]);
  if (!beforeBuffer || !afterBuffer) {
    throw new Error(`Missing snapshot file(s) in Blob store for KvK menu ${menu.id}`);
  }
  const before = JSON.parse(beforeBuffer.toString("utf8")) as MemberStat[];
  const after = JSON.parse(afterBuffer.toString("utf8")) as MemberStat[];
  const delta = diffSnapshots(before, after);
  const formula = await getFormula(menu.kingdomId);
  return scoreMembers(delta, formula);
}

export async function listKingdoms() {
  const db = await readDbSnapshot();
  return db.kingdoms;
}

export async function listCampaigns() {
  const db = await readDbSnapshot();
  return db.campaigns;
}

export async function getLatestMenuForKingdom(kingdomId: string): Promise<KvkMenu | null> {
  const menus = await listKvkMenus(kingdomId);
  return menus[0] || null; // listKvkMenus already sorts newest-first by startDate
}

export async function getManualKingdomStat(kingdomId: string): Promise<ManualKingdomStat | null> {
  const db = await readDbSnapshot();
  return db.manualStats[kingdomId] || null;
}

export async function listManualKingdomStats(): Promise<Record<string, ManualKingdomStat>> {
  const db = await readDbSnapshot();
  return db.manualStats;
}

/** Every non-primary kingdom that has at least one KvK menu, with its menu count, sorted by id. */
export async function listOtherKingdomsWithMenus(): Promise<{ id: string; menuCount: number }[]> {
  const menus = await listKvkMenus();
  const counts = new Map<string, number>();
  for (const m of menus) {
    if (m.kingdomId !== PRIMARY_KINGDOM_ID) counts.set(m.kingdomId, (counts.get(m.kingdomId) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, menuCount]) => ({ id, menuCount }))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

export async function hasCustomFormula(kingdomId: string): Promise<boolean> {
  const db = await readDbSnapshot();
  return Boolean(db.formulas[kingdomId]);
}

export interface GovernorHistoryEntry {
  menu: KvkMenu;
  member: ScoredMember;
  /** DKP rank among that menu's complete (non-`incomplete`) rows; null if this row is incomplete. */
  rank: number | null;
  rankedCount: number;
}

/**
 * One governor's row from every KvK menu they appear in, across all kingdoms
 * (a governor can migrate), newest first. Scores every menu, so cost grows
 * with the number of menus — fine at this app's scale.
 */
export async function getGovernorHistory(governorId: string): Promise<GovernorHistoryEntry[]> {
  const menus = await listKvkMenus();
  const entries = await Promise.all(
    menus.map(async (menu): Promise<GovernorHistoryEntry | null> => {
      let members: ScoredMember[];
      try {
        members = await getScoredMembers(menu);
      } catch {
        return null; // a menu with a missing snapshot blob shouldn't break the whole page
      }
      const member = members.find((m) => m.governor_id === governorId);
      if (!member) return null;
      const ranked = members.filter((m) => !m.incomplete).sort((a, b) => b.dkp - a.dkp);
      const idx = member.incomplete ? -1 : ranked.findIndex((m) => m.governor_id === governorId);
      return { menu, member, rank: idx >= 0 ? idx + 1 : null, rankedCount: ranked.length };
    })
  );
  return entries.filter((e): e is GovernorHistoryEntry => e !== null);
}

export interface MetricBenchmark {
  value: number;
  /** Median among players who earned any DKP in that KvK (the ones who actually fought). */
  median: number;
  /** Average of the 10 highest values of this metric in that KvK. */
  top10Avg: number;
  /** 1-based position by this metric among the KvK's complete rows. */
  rank: number;
}

export interface GovernorBreakdown {
  member: ScoredMember;
  playerCount: number;
  dkp: MetricBenchmark;
  kills: MetricBenchmark;
  dead: MetricBenchmark;
  /** Each enabled DKP formula term for this governor: weight × count = points. */
  contributions: { key: keyof DkpFormula; weight: number; count: number; points: number }[];
}

/** One governor's stats in one KvK, benchmarked against the rest of that KvK. Null if absent or incomplete. */
export async function getGovernorBreakdown(menu: KvkMenu, governorId: string): Promise<GovernorBreakdown | null> {
  const [members, formula] = await Promise.all([getScoredMembers(menu), getFormula(menu.kingdomId)]);
  const member = members.find((m) => m.governor_id === governorId);
  if (!member || member.incomplete) return null;

  const complete = members.filter((m) => !m.incomplete);
  const fought = complete.filter((m) => m.dkp > 0);

  function benchmark(get: (m: ScoredMember) => number): MetricBenchmark {
    const value = get(member!);
    const sortedFought = fought.map(get).sort((a, b) => a - b);
    const mid = Math.floor(sortedFought.length / 2);
    const median = sortedFought.length === 0
      ? 0
      : sortedFought.length % 2
        ? sortedFought[mid]
        : (sortedFought[mid - 1] + sortedFought[mid]) / 2;
    const top10 = complete.map(get).sort((a, b) => b - a).slice(0, 10);
    return {
      value,
      median,
      top10Avg: top10.length ? top10.reduce((s, v) => s + v, 0) / top10.length : 0,
      rank: 1 + complete.filter((m) => get(m) > value).length,
    };
  }

  const contributions = (Object.keys(formula) as (keyof DkpFormula)[])
    .filter((key) => formula[key].enabled && formula[key].weight !== 0)
    .map((key) => ({ key, weight: formula[key].weight, count: member[key], points: member[key] * formula[key].weight }));

  return {
    member,
    playerCount: complete.length,
    dkp: benchmark((m) => m.dkp),
    kills: benchmark((m) => m.kp_t4t5),
    dead: benchmark((m) => m.dead_t4t5),
    contributions,
  };
}

export async function getTargets(kingdomId: string): Promise<TargetBracket[]> {
  const db = await readDbSnapshot();
  return db.targets[kingdomId] ?? [];
}

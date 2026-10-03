import { readDbSnapshot } from "./db";
import { kvkFileName } from "./storage";
import { readBlobFile } from "./blobStorage";
import { diffSnapshots, scoreMembers } from "./dkp";
import { DEFAULT_DKP_FORMULA, DkpFormula, KvkMenu, ManualKingdomStat, MemberStat, PRIMARY_KINGDOM_ID } from "./types";

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

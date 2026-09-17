import fs from "node:fs/promises";
import { readDbSnapshot } from "./db";
import { kvkFilePath } from "./storage";
import { parseStatsExport } from "./xlsx";
import { diffSnapshots, scoreMembers } from "./dkp";
import { DEFAULT_DKP_FORMULA, DkpFormula, KvkMenu, ManualKingdomStat } from "./types";

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
    fs.readFile(kvkFilePath(menu.kingdomId, menu.beforeFileName)),
    fs.readFile(kvkFilePath(menu.kingdomId, menu.afterFileName)),
  ]);
  const before = parseStatsExport(beforeBuffer);
  const after = parseStatsExport(afterBuffer);
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

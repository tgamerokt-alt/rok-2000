"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "./session";
import { requireAdmin } from "./require-admin";
import { withDb } from "./db";
import { kvkFileName, sanitizeSegment } from "./storage";
import { deleteBlobFile, writeBlobFile } from "./blobStorage";
import { parseStatsExport, XlsxParseError } from "./xlsx";
import { Campaign, DEFAULT_DKP_FORMULA, DkpFormula, MemberStat, StatWeight } from "./types";
import { getDictionary, LOCALE_COOKIE } from "./i18n/locale";
import { formatTemplate, locales } from "./i18n/dictionaries";
import { THEME_COOKIE } from "./theme";

export interface ActionState {
  error?: string;
  success?: boolean;
}

function xlsxErrorMessage(err: unknown, t: Awaited<ReturnType<typeof getDictionary>>["t"]) {
  if (!(err instanceof XlsxParseError)) return t.errors.cannotReadFile;
  switch (err.code) {
    case "NO_SHEET":
      return t.errors.noSheet;
    case "EMPTY_FILE":
      return t.errors.emptyFile;
    case "MISSING_COLUMNS":
      return formatTemplate(t.errors.missingColumns, { cols: (err.missingColumns || []).join(", ") });
    default:
      return t.errors.cannotReadFile;
  }
}

export async function setLocaleAction(locale: string) {
  const store = await cookies();
  const safeLocale = (locales as readonly string[]).includes(locale) ? locale : "en";
  store.set(LOCALE_COOKIE, safeLocale, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function setThemeAction(theme: string) {
  const store = await cookies();
  const safeTheme = theme === "light" ? "light" : "dark";
  store.set(THEME_COOKIE, safeTheme, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    const { t } = await getDictionary();
    return { error: t.errors.invalidCredentials };
  }

  const token = await createSessionToken({ sub: email, role: "admin" });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  redirect(next.startsWith("/") ? next : "/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

function readFormWeight(formData: FormData, key: string, fallback: StatWeight): StatWeight {
  const weightRaw = formData.get(`${key}_weight`);
  const enabled = formData.get(`${key}_enabled`) === "on";
  const weight = weightRaw !== null && weightRaw !== "" ? Number(weightRaw) : fallback.weight;
  return { weight: Number.isFinite(weight) ? weight : fallback.weight, enabled };
}

/** Permanently deletes the before/after snapshot files backing each of these KvK menus. */
async function deleteKvkFiles(menus: { kingdomId: string; beforeFileName: string; afterFileName: string }[]) {
  await Promise.all(
    menus.flatMap((m) => [
      deleteBlobFile(kvkFileName(m.kingdomId, m.beforeFileName)),
      deleteBlobFile(kvkFileName(m.kingdomId, m.afterFileName)),
    ])
  );
}

/**
 * Parses the uploaded xlsx immediately on upload and keeps only the parsed
 * JSON — the xlsx library is never needed again once a snapshot is stored,
 * only at this one upload/validate step.
 */
async function readValidatedFile(
  formData: FormData,
  field: string,
  t: Awaited<ReturnType<typeof getDictionary>>["t"]
): Promise<{ members: MemberStat[] } | { error: string }> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) {
    return { error: t.errors.needFile };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    return { members: parseStatsExport(buffer) };
  } catch (err) {
    return { error: xlsxErrorMessage(err, t) };
  }
}

export async function createKvkMenuAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();

  const kingdomId = sanitizeSegment(String(formData.get("kingdomId") || "").trim());
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const name = String(formData.get("name") || "").trim();

  if (!kingdomId || !startDate || !endDate) {
    return { error: t.errors.needDatesAndKingdom };
  }

  const beforeResult = await readValidatedFile(formData, "beforeFile", t);
  if ("error" in beforeResult) return { error: beforeResult.error };
  const afterResult = await readValidatedFile(formData, "afterFile", t);
  if ("error" in afterResult) return { error: afterResult.error };

  const beforeFileName = `${kingdomId}_${startDate}_before_stats.json`;
  const afterFileName = `${kingdomId}_${endDate}_after_stats.json`;
  await Promise.all([
    writeBlobFile(kvkFileName(kingdomId, beforeFileName), JSON.stringify(beforeResult.members)),
    writeBlobFile(kvkFileName(kingdomId, afterFileName), JSON.stringify(afterResult.members)),
  ]);

  const now = new Date().toISOString();
  await withDb((db) => {
    db.kvkMenus.push({
      id: crypto.randomUUID(),
      kingdomId,
      name: name || `${startDate} – ${endDate}`,
      startDate,
      endDate,
      beforeFileName,
      afterFileName,
      createdAt: now,
      updatedAt: now,
    });
    if (!db.kingdoms.some((k) => k.id === kingdomId)) {
      db.kingdoms.push({ id: kingdomId, name: `Kingdom ${kingdomId}`, isPrimary: kingdomId === "2000" });
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/kingdom/${kingdomId}`);
  return { success: true };
}

export async function updateKvkMenuFileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();

  const menuId = String(formData.get("menuId") || "");
  const beforeFile = formData.get("beforeFile");
  const afterFile = formData.get("afterFile");
  const hasBefore = beforeFile instanceof File && beforeFile.size > 0;
  const hasAfter = afterFile instanceof File && afterFile.size > 0;
  const name = String(formData.get("name") || "").trim();

  if (!hasBefore && !hasAfter && !name) {
    return { error: t.errors.needFileOrName };
  }

  let beforeMembers: MemberStat[] | null = null;
  let afterMembers: MemberStat[] | null = null;

  if (hasBefore) {
    const result = await readValidatedFile(formData, "beforeFile", t);
    if ("error" in result) return { error: result.error };
    beforeMembers = result.members;
  }
  if (hasAfter) {
    const result = await readValidatedFile(formData, "afterFile", t);
    if ("error" in result) return { error: result.error };
    afterMembers = result.members;
  }

  const menuInfo = await withDb((db) => {
    const menu = db.kvkMenus.find((m) => m.id === menuId);
    if (!menu) return null;
    if (name) menu.name = name;
    menu.updatedAt = new Date().toISOString();
    return { kingdomId: menu.kingdomId, beforeFileName: menu.beforeFileName, afterFileName: menu.afterFileName };
  });

  if (!menuInfo) return { error: t.errors.menuNotFound };

  await Promise.all([
    beforeMembers
      ? writeBlobFile(kvkFileName(menuInfo.kingdomId, menuInfo.beforeFileName), JSON.stringify(beforeMembers))
      : Promise.resolve(),
    afterMembers
      ? writeBlobFile(kvkFileName(menuInfo.kingdomId, menuInfo.afterFileName), JSON.stringify(afterMembers))
      : Promise.resolve(),
  ]);

  revalidatePath("/admin");
  revalidatePath(`/kingdom/${menuInfo.kingdomId}`);
  return { success: true };
}

export async function deleteKvkMenuAction(menuId: string) {
  await requireAdmin();
  let kingdomId = "";
  let beforeFileName = "";
  let afterFileName = "";
  await withDb((db) => {
    const idx = db.kvkMenus.findIndex((m) => m.id === menuId);
    if (idx === -1) return;
    kingdomId = db.kvkMenus[idx].kingdomId;
    beforeFileName = db.kvkMenus[idx].beforeFileName;
    afterFileName = db.kvkMenus[idx].afterFileName;
    db.kvkMenus.splice(idx, 1);
  });
  if (kingdomId && beforeFileName && afterFileName) {
    await Promise.all([
      deleteBlobFile(kvkFileName(kingdomId, beforeFileName)),
      deleteBlobFile(kvkFileName(kingdomId, afterFileName)),
    ]);
  }
  revalidatePath("/admin");
  if (kingdomId) revalidatePath(`/kingdom/${kingdomId}`);
}

export async function updateKingdomNameAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const kingdomId = sanitizeSegment(String(formData.get("kingdomId") || "").trim());
  const name = String(formData.get("name") || "").trim();
  if (!kingdomId || !name) return { error: t.errors.kingdomNameRequired };

  await withDb((db) => {
    const kingdom = db.kingdoms.find((k) => k.id === kingdomId);
    if (kingdom) {
      kingdom.name = name;
    } else {
      db.kingdoms.push({ id: kingdomId, name, isPrimary: kingdomId === "2000" });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/formula");
  revalidatePath(`/kingdom/${kingdomId}`);
  revalidatePath("/");
  revalidatePath("/compare");
  return { success: true };
}

export async function updateFormulaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const kingdomId = sanitizeSegment(String(formData.get("kingdomId") || "").trim());
  if (!kingdomId) return { error: t.errors.kingdomRequired };

  const formula: DkpFormula = {
    kill_t1: readFormWeight(formData, "kill_t1", DEFAULT_DKP_FORMULA.kill_t1),
    kill_t2: readFormWeight(formData, "kill_t2", DEFAULT_DKP_FORMULA.kill_t2),
    kill_t3: readFormWeight(formData, "kill_t3", DEFAULT_DKP_FORMULA.kill_t3),
    kill_t4: readFormWeight(formData, "kill_t4", DEFAULT_DKP_FORMULA.kill_t4),
    kill_t5: readFormWeight(formData, "kill_t5", DEFAULT_DKP_FORMULA.kill_t5),
    dead_t1: readFormWeight(formData, "dead_t1", DEFAULT_DKP_FORMULA.dead_t1),
    dead_t2: readFormWeight(formData, "dead_t2", DEFAULT_DKP_FORMULA.dead_t2),
    dead_t3: readFormWeight(formData, "dead_t3", DEFAULT_DKP_FORMULA.dead_t3),
    dead_t4: readFormWeight(formData, "dead_t4", DEFAULT_DKP_FORMULA.dead_t4),
    dead_t5: readFormWeight(formData, "dead_t5", DEFAULT_DKP_FORMULA.dead_t5),
  };

  await withDb((db) => {
    db.formulas[kingdomId] = formula;
  });

  revalidatePath("/admin/formula");
  revalidatePath(`/kingdom/${kingdomId}`);
  return { success: true };
}

export async function resetFormulaAction(kingdomId: string) {
  await requireAdmin();
  await withDb((db) => {
    delete db.formulas[sanitizeSegment(kingdomId)];
  });
  revalidatePath("/admin/formula");
}

export async function createCampaignAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim();

  if (!name || !code) {
    return { error: t.errors.campaignRequired };
  }

  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    name,
    code,
    teams: [],
    createdAt: now,
    updatedAt: now,
  };

  await withDb((db) => {
    db.campaigns.push(campaign);
  });

  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  return { success: true };
}

export async function updateCampaignAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const campaignId = String(formData.get("campaignId") || "");
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim();

  if (!campaignId || !name || !code) {
    return { error: t.errors.campaignRequired };
  }

  let found = false;
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    found = true;
    campaign.name = name;
    campaign.code = code;
    campaign.updatedAt = new Date().toISOString();
  });

  if (!found) return { error: t.errors.menuNotFound };

  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  return { success: true };
}

export async function deleteCampaignAction(campaignId: string) {
  await requireAdmin();
  let kingdomIds: string[] = [];
  let removedMenus: { kingdomId: string; beforeFileName: string; afterFileName: string }[] = [];
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (campaign) kingdomIds = [...new Set(campaign.teams.flatMap((tm) => tm.kingdomIds))];
    db.campaigns = db.campaigns.filter((c) => c.id !== campaignId);
    removedMenus = db.kvkMenus.filter((m) => kingdomIds.includes(m.kingdomId));
    db.kvkMenus = db.kvkMenus.filter((m) => !kingdomIds.includes(m.kingdomId));
  });
  await deleteKvkFiles(removedMenus);
  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  for (const kingdomId of kingdomIds) revalidatePath(`/kingdom/${kingdomId}`);
}

export async function addCampaignTeamAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const campaignId = String(formData.get("campaignId") || "");
  const name = String(formData.get("name") || "").trim();

  if (!campaignId || !name) {
    return { error: t.errors.teamNameRequired };
  }

  let campaignFound = false;
  let nameTaken = false;
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    campaignFound = true;
    if (campaign.teams.some((tm) => tm.name.toLowerCase() === name.toLowerCase())) {
      nameTaken = true;
      return;
    }
    campaign.teams.push({ id: crypto.randomUUID(), name, kingdomIds: [] });
    campaign.updatedAt = new Date().toISOString();
  });

  if (!campaignFound) return { error: t.errors.menuNotFound };
  if (nameTaken) return { error: t.errors.campNotAvailable };

  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  return { success: true };
}

export async function deleteCampaignTeamAction(campaignId: string, teamId: string) {
  await requireAdmin();
  let kingdomIds: string[] = [];
  let removedMenus: { kingdomId: string; beforeFileName: string; afterFileName: string }[] = [];
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    const team = campaign.teams.find((tm) => tm.id === teamId);
    if (team) kingdomIds = [...team.kingdomIds];
    campaign.teams = campaign.teams.filter((tm) => tm.id !== teamId);
    campaign.updatedAt = new Date().toISOString();
    removedMenus = db.kvkMenus.filter((m) => kingdomIds.includes(m.kingdomId));
    db.kvkMenus = db.kvkMenus.filter((m) => !kingdomIds.includes(m.kingdomId));
  });
  await deleteKvkFiles(removedMenus);
  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  for (const kingdomId of kingdomIds) revalidatePath(`/kingdom/${kingdomId}`);
}

export async function addCampaignKingdomAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const campaignId = String(formData.get("campaignId") || "");
  const teamId = String(formData.get("teamId") || "");
  const kingdomIds = [
    ...new Set(
      String(formData.get("kingdomId") || "")
        .split(/[,\s]+/)
        .map((id) => sanitizeSegment(id.trim()))
        .filter(Boolean)
    ),
  ];

  if (!campaignId || !teamId || kingdomIds.length === 0) {
    return { error: t.errors.kingdomRequired };
  }

  let found = false;
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    const team = campaign?.teams.find((tm) => tm.id === teamId);
    if (!campaign || !team) return;
    found = true;
    for (const kingdomId of kingdomIds) {
      if (!team.kingdomIds.includes(kingdomId)) team.kingdomIds.push(kingdomId);
      if (!db.kingdoms.some((k) => k.id === kingdomId)) {
        db.kingdoms.push({ id: kingdomId, name: `Kingdom ${kingdomId}`, isPrimary: false });
      }
    }
    campaign.updatedAt = new Date().toISOString();
  });

  if (!found) return { error: t.errors.menuNotFound };

  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  return { success: true };
}

/** "Auto" mode of the add-kingdom form: adds each kingdom in the pasted JSON (e.g. from
 * the Lilith-API console snippet) to the team AND writes its manualStats in one action. */
export async function addCampaignKingdomsFromJsonAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const campaignId = String(formData.get("campaignId") || "");
  const teamId = String(formData.get("teamId") || "");
  const raw = String(formData.get("json") || "").trim();

  if (!campaignId || !teamId || !raw) {
    return { error: t.errors.kingdomRequired };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: t.errors.bulkImportInvalidJson };
  }
  if (!Array.isArray(parsed)) return { error: t.errors.bulkImportInvalidJson };

  let found = false;
  let count = 0;
  const now = new Date().toISOString();
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    const team = campaign?.teams.find((tm) => tm.id === teamId);
    if (!campaign || !team) return;
    found = true;
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const kingdomId = sanitizeSegment(String(record.kingdomId || "").trim());
      const power = Number(record.power);
      if (!kingdomId || !Number.isFinite(power) || power <= 0) continue;

      if (!team.kingdomIds.includes(kingdomId)) team.kingdomIds.push(kingdomId);
      if (!db.kingdoms.some((k) => k.id === kingdomId)) {
        db.kingdoms.push({ id: kingdomId, name: `Kingdom ${kingdomId}`, isPrimary: false });
      }
      db.manualStats[kingdomId] = {
        kingdomId,
        power: Math.round(power),
        dead_total: Math.round(Number(record.dead_total)) || 0,
        total_kill_points: Math.round(Number(record.total_kill_points)) || 0,
        latest_kvk_kills: Math.round(Number(record.latest_kvk_kills)) || 0,
        updatedAt: now,
      };
      count++;
    }
    campaign.updatedAt = now;
  });

  if (!found) return { error: t.errors.menuNotFound };
  if (count === 0) return { error: t.errors.bulkImportNoValidEntries };

  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  return { success: true };
}

export async function removeCampaignKingdomAction(campaignId: string, teamId: string, kingdomId: string) {
  await requireAdmin();
  let removedMenus: { kingdomId: string; beforeFileName: string; afterFileName: string }[] = [];
  await withDb((db) => {
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    const team = campaign?.teams.find((tm) => tm.id === teamId);
    if (!campaign || !team) return;
    team.kingdomIds = team.kingdomIds.filter((id) => id !== kingdomId);
    campaign.updatedAt = new Date().toISOString();
    removedMenus = db.kvkMenus.filter((m) => m.kingdomId === kingdomId);
    db.kvkMenus = db.kvkMenus.filter((m) => m.kingdomId !== kingdomId);
  });
  await deleteKvkFiles(removedMenus);
  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  revalidatePath(`/kingdom/${kingdomId}`);
}

const UNIT_MULTIPLIERS: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/** Reads a `${field}_amount` + `${field}_unit` (K/M/B/T) pair, e.g. "9.3" + "B" -> 9_300_000_000 —
 * matches how Lilith's overview page displays its totals (9.3B, 500M, ...). */
function readAmountUnit(formData: FormData, field: string): number {
  const amount = Number(formData.get(`${field}_amount`) || 0);
  const unit = String(formData.get(`${field}_unit`) || "B");
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * (UNIT_MULTIPLIERS[unit] || 1));
}

export async function setManualKingdomStatAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDictionary();
  const kingdomId = sanitizeSegment(String(formData.get("kingdomId") || "").trim());
  const power = readAmountUnit(formData, "power");

  if (!kingdomId || power <= 0) {
    return { error: t.errors.manualStatRequired };
  }

  const now = new Date().toISOString();
  await withDb((db) => {
    db.manualStats[kingdomId] = {
      kingdomId,
      power,
      dead_total: readAmountUnit(formData, "dead_total"),
      total_kill_points: readAmountUnit(formData, "total_kill_points"),
      latest_kvk_kills: readAmountUnit(formData, "latest_kvk_kills"),
      updatedAt: now,
    };
    if (!db.kingdoms.some((k) => k.id === kingdomId)) {
      db.kingdoms.push({ id: kingdomId, name: `Kingdom ${kingdomId}`, isPrimary: false });
    }
  });

  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
  return { success: true };
}

export async function deleteManualKingdomStatAction(kingdomId: string) {
  await requireAdmin();
  await withDb((db) => {
    delete db.manualStats[kingdomId];
  });
  revalidatePath("/admin/kingdoms");
  revalidatePath("/compare");
}


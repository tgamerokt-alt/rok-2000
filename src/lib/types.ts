export interface MemberStat {
  governor_id: string;
  name: string;
  power: number;
  max_power: number;
  kill_t1: number;
  kill_t2: number;
  kill_t3: number;
  kill_t4: number;
  kill_t5: number;
  dead_t1: number;
  dead_t2: number;
  dead_t3: number;
  dead_t4: number;
  dead_t5: number;
  total_kill_points: number;
  resources_gathered: number;
  alliance_help: number;
}

export interface StatWeight {
  weight: number;
  enabled: boolean;
}

export interface DkpFormula {
  kill_t1: StatWeight;
  kill_t2: StatWeight;
  kill_t3: StatWeight;
  kill_t4: StatWeight;
  kill_t5: StatWeight;
  dead_t1: StatWeight;
  dead_t2: StatWeight;
  dead_t3: StatWeight;
  dead_t4: StatWeight;
  dead_t5: StatWeight;
}

export const DEFAULT_DKP_FORMULA: DkpFormula = {
  kill_t1: { weight: 1, enabled: false },
  kill_t2: { weight: 2, enabled: false },
  kill_t3: { weight: 4, enabled: false },
  kill_t4: { weight: 10, enabled: true },
  kill_t5: { weight: 20, enabled: true },
  dead_t1: { weight: 1, enabled: false },
  dead_t2: { weight: 2, enabled: false },
  dead_t3: { weight: 4, enabled: false },
  dead_t4: { weight: 10, enabled: true },
  dead_t5: { weight: 20, enabled: true },
};

export interface KvkMenu {
  id: string;
  kingdomId: string;
  name: string;
  startDate: string;
  endDate: string;
  /** snapshot exported at startDate — captures each governor's starting power */
  beforeFileName: string;
  /** snapshot exported at endDate (or "now") — used for DKP + power change */
  afterFileName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Kingdom {
  id: string;
  name: string;
  isPrimary: boolean;
}

/**
 * The number and names of camps a Lilith cross-kingdom event splits
 * kingdoms into is NOT fixed — it varies per KvK map/chapter (e.g. Heroic
 * Anthem = 4: Fire/Earth/Water/Wind; Light and Darkness = 2: Light/Dark;
 * other configs go up to 6+). So camp name is admin-entered free text —
 * the UI offers the known common names (see CAMPAIGN_CAMP_PRESETS in
 * campaignColors.ts) as suggestions, not a restrictive whitelist.
 */
export interface CampaignTeam {
  id: string;
  name: string;
  /** Kingdom IDs assigned to this camp — any number of KDs. */
  kingdomIds: string[];
}

/**
 * A cross-kingdom KvK campaign (e.g. Lilith's "Heroic Anthem" event),
 * split into any number of admin-named camps, each holding any number of
 * kingdoms. Shown on /compare.
 */
export interface Campaign {
  id: string;
  name: string;
  /** Event code shown on Lilith's banner, e.g. "C13281". Required. */
  code: string;
  teams: CampaignTeam[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Kingdom-wide totals typed in by hand from Lilith's public overview page
 * (`statsExport/total`) — that page can be searched by kingdom number
 * without needing to be logged into that kingdom, unlike the per-governor
 * export used for KvkMenu. Used as a fallback data source on /compare for
 * kingdoms the admin doesn't administer (so has no xlsx snapshots for).
 * Mirrors the 4 totals shown on that page: power, deaths, lifetime kill
 * score, and the current KvK matchup's kill count.
 */
export interface ManualKingdomStat {
  kingdomId: string;
  power: number;
  dead_total: number;
  total_kill_points: number;
  latest_kvk_kills: number;
  updatedAt: string;
}

export interface DbSchema {
  kingdoms: Kingdom[];
  kvkMenus: KvkMenu[];
  formulas: Record<string, DkpFormula>;
  campaigns: Campaign[];
  manualStats: Record<string, ManualKingdomStat>;
}

export const PRIMARY_KINGDOM_ID = "2000";

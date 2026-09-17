import { DkpFormula, MemberStat } from "./types";

/** A member row after diffing two snapshots — cumulative counters became
 * per-KvK gains, and the starting power is carried alongside the (current)
 * power so the UI can show how much power changed. */
export interface DiffedStat extends MemberStat {
  power_start: number;
  /** true when this governor was found in only one of the two snapshots
   * (joined mid-KvK, or left before the "after" export was taken) — every
   * stat field is zeroed and the UI should render the row as dashes. */
  incomplete: boolean;
}

export interface ScoredMember extends DiffedStat {
  kp_t4t5: number;
  /** Kill points across every tier, weighted by RoK's own per-tier kill
   * point values (see KILL_POINT_WEIGHTS) — a fixed display aggregate,
   * independent of the admin-configurable DKP formula. */
  kp_weighted_all: number;
  dead_total: number;
  dead_t4t5: number;
  /** power (end) - power_start; negative means power was lost during the KvK */
  power_change: number;
  dkp: number;
}

/** RoK's own kill-point value per unit killed, by tier (T1..T5) — this is
 * the same ratio the game uses for its "Kill Points" governor stat, and
 * matches this project's default DKP kill weights (see DEFAULT_DKP_FORMULA
 * in types.ts). Fixed regardless of what the admin has configured for DKP. */
const KILL_POINT_WEIGHTS = { t1: 1, t2: 2, t3: 4, t4: 10, t5: 20 } as const;

export function scoreMember(member: DiffedStat, formula: DkpFormula): ScoredMember {
  const kp_t4t5 = member.kill_t4 + member.kill_t5;
  const kp_weighted_all =
    member.kill_t1 * KILL_POINT_WEIGHTS.t1 +
    member.kill_t2 * KILL_POINT_WEIGHTS.t2 +
    member.kill_t3 * KILL_POINT_WEIGHTS.t3 +
    member.kill_t4 * KILL_POINT_WEIGHTS.t4 +
    member.kill_t5 * KILL_POINT_WEIGHTS.t5;
  const dead_total =
    member.dead_t1 + member.dead_t2 + member.dead_t3 + member.dead_t4 + member.dead_t5;
  const dead_t4t5 = member.dead_t4 + member.dead_t5;
  const power_change = member.power - member.power_start;

  let dkp = 0;
  if (formula.kill_t1.enabled) dkp += member.kill_t1 * formula.kill_t1.weight;
  if (formula.kill_t2.enabled) dkp += member.kill_t2 * formula.kill_t2.weight;
  if (formula.kill_t3.enabled) dkp += member.kill_t3 * formula.kill_t3.weight;
  if (formula.kill_t4.enabled) dkp += member.kill_t4 * formula.kill_t4.weight;
  if (formula.kill_t5.enabled) dkp += member.kill_t5 * formula.kill_t5.weight;

  // Dead troops are weighted per tier too (T4 and T5 losses typically count
  // for more than T1-T3), same as kills — no lump-sum/override special case.
  if (formula.dead_t1.enabled) dkp += member.dead_t1 * formula.dead_t1.weight;
  if (formula.dead_t2.enabled) dkp += member.dead_t2 * formula.dead_t2.weight;
  if (formula.dead_t3.enabled) dkp += member.dead_t3 * formula.dead_t3.weight;
  if (formula.dead_t4.enabled) dkp += member.dead_t4 * formula.dead_t4.weight;
  if (formula.dead_t5.enabled) dkp += member.dead_t5 * formula.dead_t5.weight;

  return { ...member, kp_t4t5, kp_weighted_all, dead_total, dead_t4t5, power_change, dkp };
}

export function scoreMembers(members: DiffedStat[], formula: DkpFormula): ScoredMember[] {
  return members.map((m) => scoreMember(m, formula));
}

const CUMULATIVE_FIELDS = [
  "kill_t1",
  "kill_t2",
  "kill_t3",
  "kill_t4",
  "kill_t5",
  "dead_t1",
  "dead_t2",
  "dead_t3",
  "dead_t4",
  "dead_t5",
  "total_kill_points",
  "resources_gathered",
  "alliance_help",
] as const satisfies readonly (keyof MemberStat)[];

const ZERO_STATS: Omit<MemberStat, "governor_id" | "name"> = {
  power: 0,
  max_power: 0,
  kill_t1: 0,
  kill_t2: 0,
  kill_t3: 0,
  kill_t4: 0,
  kill_t5: 0,
  dead_t1: 0,
  dead_t2: 0,
  dead_t3: 0,
  dead_t4: 0,
  dead_t5: 0,
  total_kill_points: 0,
  resources_gathered: 0,
  alliance_help: 0,
};

/**
 * Diffs the "before" (start of KvK) and "after" (current/end of KvK) exports:
 * cumulative counters (kills, deaths, kill points, resources, alliance help)
 * become (after - before), clamped to >= 0. `power`/`max_power` stay as the
 * *after* snapshot's absolute value, with `power_start` carried alongside so
 * `scoreMember` can compute how much power changed.
 *
 * Every governor from either snapshot is included. A governor found in only
 * one of the two files (joined mid-KvK, or left before the "after" export
 * was taken) has no baseline/end point to diff against, so their row is
 * kept — using whichever snapshot has their name/ID — but every stat field
 * is zeroed and flagged `incomplete: true` so the UI can render it as dashes
 * instead of a misleading 0.
 */
export function diffSnapshots(before: MemberStat[], after: MemberStat[]): DiffedStat[] {
  const beforeById = new Map(before.map((m) => [m.governor_id, m]));
  const afterById = new Map(after.map((m) => [m.governor_id, m]));
  const allIds = new Set([...beforeById.keys(), ...afterById.keys()]);

  const result: DiffedStat[] = [];
  for (const id of allIds) {
    const b = beforeById.get(id);
    const a = afterById.get(id);

    if (!b || !a) {
      const known = (a ?? b)!;
      result.push({
        ...known,
        ...ZERO_STATS,
        power_start: 0,
        incomplete: true,
      });
      continue;
    }

    const delta: DiffedStat = { ...a, power_start: b.power, incomplete: false };
    for (const field of CUMULATIVE_FIELDS) {
      delta[field] = Math.max(0, a[field] - b[field]);
    }
    result.push(delta);
  }
  return result;
}

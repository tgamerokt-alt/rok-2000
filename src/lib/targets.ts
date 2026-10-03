import type { ScoredMember } from "./dkp";
import type { TargetBracket } from "./types";

/*
 * Per-kingdom KvK targets: brackets by *starting* power (the power a governor
 * entered the KvK with), each with optional T4+T5 kills / T4+T5 dead / DKP
 * requirements (0 = not required). Pure functions only — imported by both
 * server pages and client components.
 */

export type TargetMetric = "kills" | "dead" | "dkp";

export interface TargetPart {
  metric: TargetMetric;
  value: number;
  target: number;
}

export interface TargetResult {
  /** The bracket's lower bound (starting power), for labeling. */
  minPower: number;
  parts: TargetPart[];
  /** Weakest requirement's value / target — 1 means exactly on target. */
  progress: number;
  met: boolean;
}

/** Brackets sorted ascending by minPower, with no-requirement brackets kept (they exempt that power range). */
export function normalizeBrackets(brackets: TargetBracket[]): TargetBracket[] {
  return [...brackets].sort((a, b) => a.minPower - b.minPower);
}

export function bracketFor(brackets: TargetBracket[], powerStart: number): TargetBracket | null {
  let found: TargetBracket | null = null;
  for (const b of normalizeBrackets(brackets)) if (powerStart >= b.minPower) found = b;
  return found;
}

/** Null when the governor has no applicable requirement (no bracket, an all-zero bracket, or incomplete row). */
export function evaluateTarget(member: ScoredMember, brackets: TargetBracket[]): TargetResult | null {
  if (member.incomplete) return null;
  const bracket = bracketFor(brackets, member.power_start);
  if (!bracket) return null;
  const parts: TargetPart[] = (
    [
      { metric: "kills", value: member.kp_t4t5, target: bracket.kills },
      { metric: "dead", value: member.dead_t4t5, target: bracket.dead },
      { metric: "dkp", value: member.dkp, target: bracket.dkp },
    ] as TargetPart[]
  ).filter((p) => p.target > 0);
  if (parts.length === 0) return null;
  const progress = Math.min(...parts.map((p) => p.value / p.target));
  return { minPower: bracket.minPower, parts, progress, met: progress >= 1 };
}

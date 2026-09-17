export const UNIT_OPTIONS = ["K", "M", "B", "T"] as const;
export type UnitOption = (typeof UNIT_OPTIONS)[number];

const UNIT_MULTIPLIERS: Record<UnitOption, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/** Splits a raw number into a human-typed amount + unit for prefilling an edit
 * form, e.g. 9_300_000_000 -> { amount: "9.3", unit: "B" } — the inverse of
 * amount * UNIT_MULTIPLIERS[unit], matching how Lilith displays totals (9.3B). */
export function splitAmountUnit(n: number): { amount: string; unit: UnitOption } {
  if (!n) return { amount: "", unit: "B" };
  for (const unit of [...UNIT_OPTIONS].reverse()) {
    if (n >= UNIT_MULTIPLIERS[unit]) {
      const amount = n / UNIT_MULTIPLIERS[unit];
      return { amount: Number(amount.toFixed(4)).toString(), unit };
    }
  }
  return { amount: String(n), unit: "K" };
}

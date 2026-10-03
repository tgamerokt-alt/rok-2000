/** Compact, display-only number formatting shared by server pages and client charts. */

export function fmtCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  // "40M", not "40.0M"
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

export function fmtPct(fraction: number, digits = 0) {
  return `${(fraction * 100).toFixed(digits)}%`;
}

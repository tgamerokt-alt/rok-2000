type Style = { border: string; header: string; badge: string; text: string };

/** Matched case-insensitively as a substring against the team name (works for
 * both "Fire" and the bilingual "ไฟ (Fire)" suggestion values below). */
const PRESET_STYLES: { keyword: string; style: Style }[] = [
  {
    keyword: "fire",
    style: {
      border: "border-red-300 dark:border-red-900/60",
      header: "bg-red-50 dark:bg-red-950/30",
      badge: "bg-red-500 text-white",
      text: "text-red-700 dark:text-red-400",
    },
  },
  {
    keyword: "earth",
    style: {
      border: "border-amber-300 dark:border-amber-900/60",
      header: "bg-amber-50 dark:bg-amber-950/30",
      badge: "bg-amber-500 text-white",
      text: "text-amber-700 dark:text-amber-400",
    },
  },
  {
    keyword: "water",
    style: {
      border: "border-sky-300 dark:border-sky-900/60",
      header: "bg-sky-50 dark:bg-sky-950/30",
      badge: "bg-sky-500 text-white",
      text: "text-sky-700 dark:text-sky-400",
    },
  },
  {
    keyword: "wind",
    style: {
      border: "border-violet-300 dark:border-violet-900/60",
      header: "bg-violet-50 dark:bg-violet-950/30",
      badge: "bg-violet-500 text-white",
      text: "text-violet-700 dark:text-violet-400",
    },
  },
  {
    keyword: "light",
    style: {
      border: "border-yellow-300 dark:border-yellow-900/60",
      header: "bg-yellow-50 dark:bg-yellow-950/30",
      badge: "bg-yellow-500 text-white",
      text: "text-yellow-700 dark:text-yellow-400",
    },
  },
  {
    keyword: "dark",
    style: {
      border: "border-slate-400 dark:border-slate-700",
      header: "bg-slate-100 dark:bg-slate-800/60",
      badge: "bg-slate-600 text-white",
      text: "text-slate-700 dark:text-slate-300",
    },
  },
];

const FALLBACK_PALETTE: Style[] = [
  {
    border: "border-emerald-300 dark:border-emerald-900/60",
    header: "bg-emerald-50 dark:bg-emerald-950/30",
    badge: "bg-emerald-500 text-white",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  {
    border: "border-rose-300 dark:border-rose-900/60",
    header: "bg-rose-50 dark:bg-rose-950/30",
    badge: "bg-rose-500 text-white",
    text: "text-rose-700 dark:text-rose-400",
  },
  {
    border: "border-cyan-300 dark:border-cyan-900/60",
    header: "bg-cyan-50 dark:bg-cyan-950/30",
    badge: "bg-cyan-500 text-white",
    text: "text-cyan-700 dark:text-cyan-400",
  },
];

/** Known camp names across RoK's various KvK maps/chapters — offered as
 * suggestions when adding a camp, not an exhaustive/restrictive list. */
export const CAMPAIGN_CAMP_PRESETS: Record<"en" | "th", string[]> = {
  en: ["Fire", "Earth", "Water", "Wind", "Light", "Dark"],
  th: ["ไฟ (Fire)", "ดิน (Earth)", "น้ำ (Water)", "ลม (Wind)", "แสง (Light)", "มืด (Dark)"],
};

/** Colors a camp card by matching known element/faction names; anything
 * unrecognized (custom camp names) falls back to a rotating palette. */
export function styleForTeam(name: string, index: number): Style {
  const lower = name.toLowerCase();
  const preset = PRESET_STYLES.find((p) => lower.includes(p.keyword));
  if (preset) return preset.style;
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

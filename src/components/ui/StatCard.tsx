export type StatTheme =
  | "blue"
  | "emerald"
  | "red"
  | "rose"
  | "orange"
  | "cyan"
  | "yellow"
  | "fuchsia"
  | "violet"
  | "amber";

const THEME: Record<StatTheme, { icon: string; border: string; glow: string }> = {
  blue: { icon: "bg-blue-500/15 text-blue-400", border: "border-blue-500/25", glow: "shadow-blue-500/10" },
  emerald: {
    icon: "bg-emerald-500/15 text-emerald-400",
    border: "border-emerald-500/25",
    glow: "shadow-emerald-500/10",
  },
  red: { icon: "bg-red-500/15 text-red-400", border: "border-red-500/25", glow: "shadow-red-500/10" },
  rose: { icon: "bg-rose-500/15 text-rose-400", border: "border-rose-500/25", glow: "shadow-rose-500/10" },
  orange: {
    icon: "bg-orange-500/15 text-orange-400",
    border: "border-orange-500/25",
    glow: "shadow-orange-500/10",
  },
  cyan: { icon: "bg-cyan-500/15 text-cyan-400", border: "border-cyan-500/25", glow: "shadow-cyan-500/10" },
  yellow: {
    icon: "bg-yellow-500/15 text-yellow-400",
    border: "border-yellow-500/25",
    glow: "shadow-yellow-500/10",
  },
  fuchsia: {
    icon: "bg-fuchsia-500/15 text-fuchsia-400",
    border: "border-fuchsia-500/25",
    glow: "shadow-fuchsia-500/10",
  },
  violet: {
    icon: "bg-violet-500/15 text-violet-400",
    border: "border-violet-500/25",
    glow: "shadow-violet-500/10",
  },
  amber: { icon: "bg-amber-500/15 text-amber-400", border: "border-amber-500/25", glow: "shadow-amber-500/10" },
};

export type StatIconName = "power" | "trend" | "sword" | "skull" | "trophy" | "skulls";

function StatIcon({ name, className }: { name: StatIconName; className?: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "power":
      return (
        <svg {...common}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M17 7h4v4" />
        </svg>
      );
    case "sword":
      return (
        <svg {...common}>
          <path d="m14.5 3.5 6 6-3 3-6-6 3-3Z" />
          <path d="M13.5 10.5 4 20" />
          <path d="M6 18l2 2" />
          <path d="M15 4l1.5-1.5M18.5 7.5 20 6" />
        </svg>
      );
    case "skull":
      return (
        <svg {...common}>
          <path d="M12 3a7 7 0 0 0-7 7v2.5L4 15h2v2a2 2 0 0 0 2 2h1v-2h6v2h1a2 2 0 0 0 2-2v-2h2l-1-2.5V10a7 7 0 0 0-7-7Z" />
          <circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "skulls":
      return (
        <svg {...common}>
          <path d="M12 3a7 7 0 0 0-7 7v2.5L4 15h2v2a2 2 0 0 0 2 2h1v-2h6v2h1a2 2 0 0 0 2-2v-2h2l-1-2.5V10a7 7 0 0 0-7-7Z" />
          <circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none" />
          <path d="M9.5 16.5h5" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" />
          <path d="M7 4H4a2 2 0 0 0 2 4.5" />
          <path d="M17 4h3a2 2 0 0 1-2 4.5" />
          <path d="M12 13v3" />
          <path d="M9 20h6" />
          <path d="M9.5 16h5l.5 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2l.5-2Z" />
        </svg>
      );
  }
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function fmtSigned(n: number) {
  return n > 0 ? `+${fmt(n)}` : fmt(n);
}

export function StatCard({
  label,
  value,
  theme,
  icon,
  signed = false,
}: {
  label: string;
  value: number;
  theme: StatTheme;
  icon: StatIconName;
  signed?: boolean;
}) {
  const palette = THEME[theme];
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-lg transition dark:bg-slate-900 ${palette.border} ${palette.glow}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${palette.icon}`}>
          <StatIcon name={icon} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">
        {signed ? fmtSigned(value) : fmt(value)}
      </div>
    </div>
  );
}

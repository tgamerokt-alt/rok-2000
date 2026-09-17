const MEDALS: Record<number, { text: string; bg: string }> = {
  1: { text: "text-yellow-400", bg: "bg-yellow-400/15" }, // gold
  2: { text: "text-slate-300", bg: "bg-slate-300/15" }, // silver
  3: { text: "text-amber-600", bg: "bg-amber-600/15" }, // bronze
};

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" />
      <path d="M7 4H4a2 2 0 0 0 2 4.5" />
      <path d="M17 4h3a2 2 0 0 1-2 4.5" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M9.5 16h5l.5 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2l.5-2Z" />
    </svg>
  );
}

export function RankBadge({ rank, showMedal = true }: { rank: number; showMedal?: boolean }) {
  const medal = showMedal ? MEDALS[rank] : undefined;

  if (!medal) {
    return <span className="text-slate-500">{rank}</span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${medal.bg} ${medal.text}`}
    >
      <TrophyIcon />
      {rank}
    </span>
  );
}

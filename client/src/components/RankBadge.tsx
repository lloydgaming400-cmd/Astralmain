import { cn } from "@/lib/utils";

const ranks = [
  { name: "Core Disciple of Mid", color: "bg-slate-500", threshold: 0 },
  { name: "Outer Disciple of Low Peak", color: "bg-emerald-600", threshold: 100 },
  { name: "Inner Disciple of Mid Peak", color: "bg-blue-600", threshold: 500 },
  { name: "Core Disciple of Peak", color: "bg-indigo-600", threshold: 2000 },
  { name: "Celestial Lord", color: "bg-purple-600", threshold: 10000 },
  { name: "Dao of Heavenly Peak", color: "bg-pink-600", threshold: 20000 },
  { name: "Supreme Dao Ancestor", color: "bg-rose-600", threshold: 35000 },
  { name: "True Peak Dao of Astral Realm", color: "bg-amber-500", threshold: 50000 },
];

export function RankBadge({ xp, className }: { xp: number; className?: string }) {
  // Find current rank (highest threshold <= xp)
  const rank = [...ranks].reverse().find(r => xp >= r.threshold) || ranks[0];
  const isHighest = rank.threshold === 50000;

  return (
    <div className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm",
      rank.color,
      isHighest ? "shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-yellow-200/50" : "border border-white/10",
      className
    )}>
      {rank.name}
    </div>
  );
}

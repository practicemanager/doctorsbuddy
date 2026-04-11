import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  healthy: "fill-emerald-400 hover:fill-emerald-500",
  decayed: "fill-orange-400 hover:fill-orange-500",
  missing: "fill-gray-700 hover:fill-gray-800",
  treated: "fill-blue-400 hover:fill-blue-500",
  needs_treatment: "fill-red-400 hover:fill-red-500",
};

interface ToothSVGProps {
  toothNumber: number;
  status: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function ToothSVG({ toothNumber, status, isSelected, onClick }: ToothSVGProps) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.healthy;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1 rounded-lg transition-all",
        isSelected && "ring-2 ring-primary bg-accent"
      )}
      title={`Tooth ${toothNumber} - ${status}`}
    >
      <svg viewBox="0 0 30 40" className="w-7 h-9">
        {/* Simple tooth shape */}
        <path
          d="M7 5 C7 2, 12 0, 15 0 C18 0, 23 2, 23 5 L24 18 C24 22, 22 28, 20 32 C19 35, 18 38, 17 39 C16 40, 14 40, 13 39 C12 38, 11 35, 10 32 C8 28, 6 22, 6 18 Z"
          className={cn("stroke-foreground/30 stroke-[0.5] transition-colors cursor-pointer", colorClass)}
        />
        {status === "missing" && (
          <line x1="8" y1="5" x2="22" y2="35" className="stroke-white/60 stroke-[1.5]" />
        )}
      </svg>
      <span className="text-[10px] font-mono text-muted-foreground">{toothNumber}</span>
    </button>
  );
}

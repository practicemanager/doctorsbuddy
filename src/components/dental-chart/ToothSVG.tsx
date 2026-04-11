import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  healthy: { fill: "fill-emerald-100", stroke: "stroke-emerald-500" },
  decayed: { fill: "fill-orange-200", stroke: "stroke-orange-500" },
  missing: { fill: "fill-gray-300", stroke: "stroke-gray-600" },
  treated: { fill: "fill-blue-200", stroke: "stroke-blue-500" },
  needs_treatment: { fill: "fill-red-200", stroke: "stroke-red-500" },
  under_observation: { fill: "fill-yellow-200", stroke: "stroke-yellow-500" },
  restored: { fill: "fill-sky-200", stroke: "stroke-sky-500" },
};

interface ToothSVGProps {
  toothNumber: number;
  status: string;
  isSelected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}

export default function ToothSVG({ toothNumber, status, isSelected, onClick, size = "md" }: ToothSVGProps) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.healthy;
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  // Odontogram-style: 5-surface tooth view (buccal, lingual, mesial, distal, occlusal)
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 p-0.5 rounded transition-all",
        isSelected && "ring-2 ring-primary bg-primary/10 scale-110"
      )}
      title={`Tooth ${toothNumber} - ${status.replace("_", " ")}`}
    >
      <svg viewBox="0 0 40 40" className={cn(dim, "transition-transform")}>
        {/* Outer ring - buccal */}
        <circle cx="20" cy="20" r="17" className={cn(colors.fill, colors.stroke, "stroke-[1.5]")} />
        {/* Inner cross dividers */}
        <line x1="10" y1="10" x2="30" y2="30" className="stroke-foreground/20 stroke-[0.8]" />
        <line x1="30" y1="10" x2="10" y2="30" className="stroke-foreground/20 stroke-[0.8]" />
        {/* Center circle - occlusal */}
        <circle cx="20" cy="20" r="8" className={cn(colors.fill, colors.stroke, "stroke-[1.5]")} />
        {status === "missing" && (
          <>
            <line x1="8" y1="8" x2="32" y2="32" className="stroke-red-500 stroke-[2]" />
            <line x1="32" y1="8" x2="8" y2="32" className="stroke-red-500 stroke-[2]" />
          </>
        )}
      </svg>
      <span className={cn("font-mono text-muted-foreground", size === "sm" ? "text-[8px]" : "text-[10px]")}>{toothNumber}</span>
    </button>
  );
}

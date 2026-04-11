import ToothSVG from "./ToothSVG";

// Universal numbering (FDI): quadrants 1-4, teeth 1-8
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]; // Q1
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];   // Q2
const LOWER_LEFT = [38, 37, 36, 35, 34, 33, 32, 31];   // Q3
const LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];  // Q4

interface ToothData {
  tooth_number: number;
  status: string;
  id?: string;
}

interface DentalChartGridProps {
  toothRecords: ToothData[];
  selectedTooth: number | null;
  onSelectTooth: (toothNumber: number) => void;
}

function getStatus(records: ToothData[], num: number) {
  return records.find(r => r.tooth_number === num)?.status || "healthy";
}

export default function DentalChartGrid({ toothRecords, selectedTooth, onSelectTooth }: DentalChartGridProps) {
  const renderRow = (teeth: number[], label: string) => (
    <div className="flex items-center gap-0.5">
      <span className="text-xs font-medium text-muted-foreground w-6 shrink-0">{label}</span>
      {teeth.map(num => (
        <ToothSVG
          key={num}
          toothNumber={num}
          status={getStatus(toothRecords, num)}
          isSelected={selectedTooth === num}
          onClick={() => onSelectTooth(num)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Upper jaw */}
      <div className="text-center text-xs font-semibold text-muted-foreground mb-1">Upper Jaw</div>
      <div className="flex justify-center gap-4">
        {renderRow(UPPER_RIGHT, "UR")}
        <div className="w-px bg-border" />
        {renderRow(UPPER_LEFT, "UL")}
      </div>

      <div className="border-t border-dashed border-border my-2" />

      {/* Lower jaw */}
      <div className="flex justify-center gap-4">
        {renderRow(LOWER_LEFT, "LL")}
        <div className="w-px bg-border" />
        {renderRow(LOWER_RIGHT, "LR")}
      </div>
      <div className="text-center text-xs font-semibold text-muted-foreground mt-1">Lower Jaw</div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 pt-4 border-t">
        {[
          { label: "Healthy", color: "bg-emerald-400" },
          { label: "Needs Treatment", color: "bg-red-400" },
          { label: "Treated", color: "bg-blue-400" },
          { label: "Decayed", color: "bg-orange-400" },
          { label: "Missing", color: "bg-gray-700" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-3 w-3 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

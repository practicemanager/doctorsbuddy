import { useState } from "react";
import ToothSVG from "./ToothSVG";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Baby, User } from "lucide-react";

// Adult FDI
const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const ADULT_LOWER_LEFT = [38, 37, 36, 35, 34, 33, 32, 31];
const ADULT_LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];

// Kids (deciduous) FDI
const KIDS_UPPER_RIGHT = [55, 54, 53, 52, 51];
const KIDS_UPPER_LEFT = [61, 62, 63, 64, 65];
const KIDS_LOWER_LEFT = [75, 74, 73, 72, 71];
const KIDS_LOWER_RIGHT = [81, 82, 83, 84, 85];

interface ToothData {
  tooth_number: number;
  status: string;
  id?: string;
}

interface DentalChartGridProps {
  toothRecords: ToothData[];
  selectedTooth: number | null;
  onSelectTooth: (toothNumber: number) => void;
  chartType: "adult" | "kids";
  onChartTypeChange: (type: "adult" | "kids") => void;
}

function getStatus(records: ToothData[], num: number) {
  return records.find(r => r.tooth_number === num)?.status || "healthy";
}

export default function DentalChartGrid({ toothRecords, selectedTooth, onSelectTooth, chartType, onChartTypeChange }: DentalChartGridProps) {
  const isKids = chartType === "kids";

  const upperRight = isKids ? KIDS_UPPER_RIGHT : ADULT_UPPER_RIGHT;
  const upperLeft = isKids ? KIDS_UPPER_LEFT : ADULT_UPPER_LEFT;
  const lowerLeft = isKids ? KIDS_LOWER_LEFT : ADULT_LOWER_LEFT;
  const lowerRight = isKids ? KIDS_LOWER_RIGHT : ADULT_LOWER_RIGHT;

  const renderRow = (teeth: number[], label: string) => (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] font-semibold text-muted-foreground w-6 shrink-0 text-center">{label}</span>
      {teeth.map(num => (
        <ToothSVG
          key={num}
          toothNumber={num}
          status={getStatus(toothRecords, num)}
          isSelected={selectedTooth === num}
          onClick={() => onSelectTooth(num)}
          size={isKids ? "md" : "md"}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Chart type toggle */}
      <div className="flex justify-between items-center">
        <Tabs value={chartType} onValueChange={v => onChartTypeChange(v as "adult" | "kids")}>
          <TabsList className="h-8">
            <TabsTrigger value="adult" className="text-xs gap-1 px-3 h-7"><User className="h-3 w-3" />Adult (32)</TabsTrigger>
            <TabsTrigger value="kids" className="text-xs gap-1 px-3 h-7"><Baby className="h-3 w-3" />Kids (20)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Upper jaw */}
      <div className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Upper Jaw</div>
      <div className="flex justify-center gap-2">
        {renderRow(upperRight, "R")}
        <div className="w-px bg-border self-stretch" />
        {renderRow(upperLeft, "L")}
      </div>

      {/* Divider with labels */}
      <div className="flex items-center gap-2 px-4">
        <span className="text-[9px] text-muted-foreground font-medium">RIGHT</span>
        <div className="flex-1 border-t border-dashed border-border" />
        <span className="text-[9px] text-muted-foreground font-bold">LINGUAL</span>
        <div className="flex-1 border-t border-dashed border-border" />
        <span className="text-[9px] text-muted-foreground font-medium">LEFT</span>
      </div>

      {/* Lower jaw */}
      <div className="flex justify-center gap-2">
        {renderRow(lowerLeft, "R")}
        <div className="w-px bg-border self-stretch" />
        {renderRow(lowerRight, "L")}
      </div>
      <div className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lower Jaw</div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3 border-t">
        {[
          { label: "Healthy", color: "bg-emerald-300 border-emerald-500" },
          { label: "Needs Tx", color: "bg-red-300 border-red-500" },
          { label: "Treated", color: "bg-blue-300 border-blue-500" },
          { label: "Decayed", color: "bg-orange-300 border-orange-500" },
          { label: "Observation", color: "bg-yellow-300 border-yellow-500" },
          { label: "Restored", color: "bg-sky-300 border-sky-500" },
          { label: "Missing", color: "bg-gray-400 border-gray-600" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className={`h-2.5 w-2.5 rounded-full border ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

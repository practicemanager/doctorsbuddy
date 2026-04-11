import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";

interface ClinicalExamPanelProps {
  chiefComplaint: string;
  gumCondition: string;
  alignmentCondition: string;
  diagnosisNotes: string;
  onChange: (field: string, value: string) => void;
}

const GUM_CONDITIONS = ["Normal", "Gingivitis", "Periodontitis", "Recession", "Swelling", "Bleeding", "Abscess"];
const ALIGNMENT_CONDITIONS = ["Normal", "Crowding", "Spacing", "Crossbite", "Overbite", "Underbite", "Open Bite", "Deep Bite"];

export default function ClinicalExamPanel({
  chiefComplaint, gumCondition, alignmentCondition, diagnosisNotes, onChange,
}: ClinicalExamPanelProps) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Clinical Examination
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs font-semibold">Chief Complaint</Label>
          <Textarea
            placeholder="Patient's main concern..."
            value={chiefComplaint}
            onChange={e => onChange("chief_complaint", e.target.value)}
            rows={2}
            className="mt-1 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold">Gum Condition</Label>
            <Select value={gumCondition} onValueChange={v => onChange("gum_condition", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GUM_CONDITIONS.map(g => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Alignment</Label>
            <Select value={alignmentCondition} onValueChange={v => onChange("alignment_condition", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALIGNMENT_CONDITIONS.map(a => <SelectItem key={a} value={a.toLowerCase()}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold">Diagnosis Notes</Label>
          <Textarea
            placeholder="Clinical findings..."
            value={diagnosisNotes}
            onChange={e => onChange("diagnosis_notes", e.target.value)}
            rows={2}
            className="mt-1 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

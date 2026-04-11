import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TreatmentQuickPanelProps {
  patientId: string;
  clinicId: string;
  toothNumber: number | null;
  toothRecordId?: string;
  onUpdate: () => void;
}

const CONDITION_BUTTONS = [
  "Caries", "Attrition", "Abrasion", "Fracture", "Mobility",
  "Impacted", "Stain", "Calculus", "Infection", "Abscess",
  "Erosion", "Gingivitis", "Periodontitis", "Malocclusion",
];

const TREATMENT_BUTTONS = [
  "Exam", "X-Ray", "Scaling", "Filling", "Root Canal (RCT)",
  "Crown", "Extraction", "Implant", "Bridge", "Veneer",
  "Whitening", "Orthodontics", "Denture", "Pulp Procedure",
  "Observation",
];

export default function TreatmentQuickPanel({
  patientId, clinicId, toothNumber, toothRecordId, onUpdate,
}: TreatmentQuickPanelProps) {
  const queryClient = useQueryClient();

  const { data: pricingMap } = useQuery({
    queryKey: ["treatment-pricing", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("treatment_pricing").select("treatment_name, base_price").eq("clinic_id", clinicId);
      const map: Record<string, number> = {};
      data?.forEach((p: any) => { map[p.treatment_name] = Number(p.base_price); });
      return map;
    },
    enabled: !!clinicId,
  });

  const ensureToothRecord = async (): Promise<string> => {
    if (toothRecordId) return toothRecordId;
    const { data, error } = await supabase.from("tooth_records")
      .insert({ patient_id: patientId, clinic_id: clinicId, tooth_number: toothNumber!, status: "healthy" as any })
      .select("id").single();
    if (error) throw error;
    onUpdate();
    return data.id;
  };

  const quickAddCondition = useMutation({
    mutationFn: async (name: string) => {
      if (!toothNumber) throw new Error("Select a tooth first");
      const recordId = await ensureToothRecord();
      const { error } = await supabase.from("tooth_conditions").insert({
        tooth_record_id: recordId, condition_name: name, severity: "moderate",
      });
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["tooth-conditions"] });
      queryClient.invalidateQueries({ queryKey: ["treatment-summary"] });
      toast.success(`${name} added`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const quickAddTreatment = useMutation({
    mutationFn: async (name: string) => {
      if (!toothNumber) throw new Error("Select a tooth first");
      const recordId = await ensureToothRecord();
      const cost = pricingMap?.[name] || 0;
      const { error } = await supabase.from("tooth_treatments").insert({
        tooth_record_id: recordId, treatment_name: name, status: "planned" as any, cost,
      });
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["tooth-treatments"] });
      queryClient.invalidateQueries({ queryKey: ["treatment-summary"] });
      toast.success(`${name} planned`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disabled = !toothNumber;

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">
          Quick Actions {toothNumber ? <Badge variant="outline" className="ml-2">Tooth {toothNumber}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conditions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Conditions</p>
          <div className="flex flex-wrap gap-1.5">
            {CONDITION_BUTTONS.map(c => (
              <button
                key={c}
                disabled={disabled || quickAddCondition.isPending}
                onClick={() => quickAddCondition.mutate(c)}
                className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Treatments */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Treatments</p>
          <div className="flex flex-wrap gap-1.5">
            {TREATMENT_BUTTONS.map(t => (
              <button
                key={t}
                disabled={disabled || quickAddTreatment.isPending}
                onClick={() => quickAddTreatment.mutate(t)}
                className="px-2 py-1 text-xs rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {!toothNumber && (
          <p className="text-xs text-muted-foreground text-center py-2">← Select a tooth to use quick actions</p>
        )}
      </CardContent>
    </Card>
  );
}

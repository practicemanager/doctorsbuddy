import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";

interface UnifiedToothEntryProps {
  prescriptionId: string;
  clinicId: string;
  toothNumber: number;
  currentStatus: string;
  toothRecordId?: string;
  patientId: string;
  onUpdate: () => void;
}

const COMMON_CONDITIONS = ["Caries", "Cavity", "Crack", "Abscess", "Gingivitis", "Periodontitis", "Erosion", "Impacted", "Malocclusion", "Attrition", "Abrasion", "Fracture", "Mobility", "Stain", "Calculus", "Infection"];
const COMMON_TREATMENTS = ["Filling", "Root Canal (RCT)", "Crown", "Extraction", "Scaling", "Veneer", "Bridge", "Implant", "Whitening", "Orthodontics", "Denture", "Pulp Procedure", "X-Ray", "Observation"];
const TOOTH_STATUSES = ["healthy", "decayed", "missing", "treated", "needs_treatment", "under_observation", "restored"];

export default function UnifiedToothEntry({
  prescriptionId, clinicId, toothNumber, currentStatus, toothRecordId, patientId, onUpdate,
}: UnifiedToothEntryProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    condition: "",
    treatment: "",
    treatment_status: "planned",
    cost: "",
    notes: "",
  });

  const { data: existingItems = [] } = useQuery({
    queryKey: ["prescription-items", prescriptionId, toothNumber],
    queryFn: async () => {
      const { data } = await supabase
        .from("prescription_items")
        .select("*")
        .eq("prescription_id", prescriptionId)
        .eq("tooth_number", toothNumber)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!prescriptionId,
  });

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

  const handleTreatmentSelect = (name: string) => {
    const price = pricingMap?.[name];
    setForm(f => ({ ...f, treatment: name, cost: price ? String(price) : f.cost }));
  };

  const ensureToothRecord = async (): Promise<string> => {
    if (toothRecordId) return toothRecordId;
    const { data, error } = await supabase.from("tooth_records")
      .insert({ patient_id: patientId, clinic_id: clinicId, tooth_number: toothNumber, status: "healthy" as any })
      .select("id").single();
    if (error) throw error;
    onUpdate();
    return data.id;
  };

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (toothRecordId) {
        await supabase.from("tooth_records").update({ status: newStatus as any }).eq("id", toothRecordId);
      } else {
        await supabase.from("tooth_records").insert({
          patient_id: patientId, clinic_id: clinicId, tooth_number: toothNumber, status: newStatus as any,
        });
      }
    },
    onSuccess: () => { onUpdate(); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveEntry = useMutation({
    mutationFn: async () => {
      if (!form.condition && !form.treatment) throw new Error("Select at least a condition or treatment");
      const recordId = await ensureToothRecord();

      await supabase.from("prescription_items").insert({
        prescription_id: prescriptionId,
        tooth_number: toothNumber,
        condition: form.condition || null,
        treatment: form.treatment || null,
        treatment_status: form.treatment_status,
        cost: form.cost ? Number(form.cost) : 0,
        notes: form.notes || null,
      });

      if (form.condition) {
        await supabase.from("tooth_conditions").insert({
          tooth_record_id: recordId, condition_name: form.condition, severity: "moderate",
        });
      }
      if (form.treatment) {
        await supabase.from("tooth_treatments").insert({
          tooth_record_id: recordId, treatment_name: form.treatment,
          status: form.treatment_status as any, cost: form.cost ? Number(form.cost) : 0, notes: form.notes,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-items"] });
      queryClient.invalidateQueries({ queryKey: ["tooth-conditions"] });
      queryClient.invalidateQueries({ queryKey: ["tooth-treatments"] });
      queryClient.invalidateQueries({ queryKey: ["treatment-summary"] });
      setForm({ condition: "", treatment: "", treatment_status: "planned", cost: "", notes: "" });
      toast.success("Entry saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("prescription_items").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-items"] });
      toast.success("Entry removed");
    },
  });

  const statusColors: Record<string, string> = {
    healthy: "bg-emerald-100 text-emerald-800",
    decayed: "bg-orange-100 text-orange-800",
    missing: "bg-gray-200 text-gray-800",
    treated: "bg-blue-100 text-blue-800",
    needs_treatment: "bg-red-100 text-red-800",
    under_observation: "bg-yellow-100 text-yellow-800",
    restored: "bg-sky-100 text-sky-800",
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base">Tooth #{toothNumber}</CardTitle>
          <Badge className={statusColors[currentStatus] || ""}>{currentStatus.replace("_", " ")}</Badge>
        </div>
        <div className="pt-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {TOOTH_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => updateStatus.mutate(s)}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                  currentStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider">Condition (Dx)</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {COMMON_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider">Treatment (Tx)</Label>
              <Select value={form.treatment} onValueChange={handleTreatmentSelect}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {COMMON_TREATMENTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider">Tx Status</Label>
              <Select value={form.treatment_status} onValueChange={v => setForm(f => ({ ...f, treatment_status: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider">Cost (₹)</Label>
              <Input className="h-8 text-xs" type="number" placeholder="0" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
          </div>
          <Textarea className="text-xs" placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <Button size="sm" className="w-full" onClick={() => saveEntry.mutate()} disabled={(!form.condition && !form.treatment) || saveEntry.isPending}>
            <Save className="h-3 w-3 mr-1" />{saveEntry.isPending ? "Saving..." : "Add Entry"}
          </Button>
        </div>

        {existingItems.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Entries this visit</Label>
            {existingItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded bg-muted text-xs">
                <div className="flex-1 space-y-0.5">
                  <div className="flex gap-2">
                    {item.condition && <Badge variant="secondary" className="text-[10px]">Dx: {item.condition}</Badge>}
                    {item.treatment && <Badge className="text-[10px]">Tx: {item.treatment}</Badge>}
                  </div>
                  {item.cost > 0 && <span className="text-muted-foreground">₹{Number(item.cost).toLocaleString()}</span>}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteItem.mutate(item.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

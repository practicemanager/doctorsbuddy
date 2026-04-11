import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Stethoscope, Pill, FileText } from "lucide-react";

interface ToothDetailPanelProps {
  patientId: string;
  clinicId: string;
  toothNumber: number;
  toothRecordId?: string;
  currentStatus: string;
  onUpdate: () => void;
}

const TOOTH_STATUSES = ["healthy", "decayed", "missing", "treated", "needs_treatment"];
const COMMON_CONDITIONS = ["Cavity", "Crack", "Abscess", "Gingivitis", "Periodontitis", "Erosion", "Impacted", "Malocclusion"];
const COMMON_TREATMENTS = ["Filling", "Root Canal (RCT)", "Crown", "Extraction", "Scaling", "Veneer", "Bridge", "Implant", "Whitening"];

export default function ToothDetailPanel({
  patientId, clinicId, toothNumber, toothRecordId, currentStatus, onUpdate,
}: ToothDetailPanelProps) {
  const queryClient = useQueryClient();
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [conditionForm, setConditionForm] = useState({ condition_name: "", severity: "moderate", notes: "" });
  const [treatmentForm, setTreatmentForm] = useState({ treatment_name: "", status: "planned" as string, cost: "", notes: "" });

  // Fetch conditions for this tooth
  const { data: conditions } = useQuery({
    queryKey: ["tooth-conditions", toothRecordId],
    queryFn: async () => {
      if (!toothRecordId) return [];
      const { data } = await supabase.from("tooth_conditions").select("*").eq("tooth_record_id", toothRecordId).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!toothRecordId,
  });

  // Fetch treatments for this tooth
  const { data: treatments } = useQuery({
    queryKey: ["tooth-treatments", toothRecordId],
    queryFn: async () => {
      if (!toothRecordId) return [];
      const { data } = await supabase.from("tooth_treatments").select("*").eq("tooth_record_id", toothRecordId).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!toothRecordId,
  });

  // Upsert tooth record + update status
  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (toothRecordId) {
        const { error } = await supabase.from("tooth_records").update({ status: newStatus as any }).eq("id", toothRecordId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tooth_records").insert({
          patient_id: patientId, clinic_id: clinicId, tooth_number: toothNumber, status: newStatus as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { onUpdate(); toast.success("Tooth status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const ensureToothRecord = async (): Promise<string> => {
    if (toothRecordId) return toothRecordId;
    const { data, error } = await supabase.from("tooth_records")
      .insert({ patient_id: patientId, clinic_id: clinicId, tooth_number: toothNumber, status: "healthy" as any })
      .select("id").single();
    if (error) throw error;
    onUpdate();
    return data.id;
  };

  const addCondition = useMutation({
    mutationFn: async () => {
      const recordId = await ensureToothRecord();
      const { error } = await supabase.from("tooth_conditions").insert({
        tooth_record_id: recordId, ...conditionForm,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tooth-conditions"] });
      setShowConditionForm(false);
      setConditionForm({ condition_name: "", severity: "moderate", notes: "" });
      toast.success("Condition added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deductMaterials = async (treatmentName: string, treatmentId: string) => {
    // Fetch mappings for this treatment
    const { data: mappings } = await supabase
      .from("treatment_material_mappings")
      .select("inventory_item_id, quantity_needed")
      .eq("clinic_id", clinicId)
      .eq("treatment_name", treatmentName);

    if (mappings && mappings.length > 0) {
      for (const m of mappings) {
        try {
          await supabase.rpc("deduct_inventory", {
            p_item_id: m.inventory_item_id,
            p_quantity: m.quantity_needed,
            p_treatment_id: treatmentId,
          });
        } catch (err: any) {
          toast.error(`Stock deduction failed: ${err.message}`);
        }
      }
      toast.success("Inventory auto-deducted for linked materials");
    }
  };

  const addTreatment = useMutation({
    mutationFn: async () => {
      const recordId = await ensureToothRecord();
      const { error } = await supabase.from("tooth_treatments").insert({
        tooth_record_id: recordId,
        treatment_name: treatmentForm.treatment_name,
        status: treatmentForm.status as any,
        cost: treatmentForm.cost ? Number(treatmentForm.cost) : 0,
        notes: treatmentForm.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tooth-treatments"] });
      setShowTreatmentForm(false);
      setTreatmentForm({ treatment_name: "", status: "planned", cost: "", notes: "" });
      toast.success("Treatment added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTreatmentStatus = useMutation({
    mutationFn: async ({ id, newStatus, treatmentName }: { id: string; newStatus: string; treatmentName: string }) => {
      const { error } = await supabase.from("tooth_treatments").update({ status: newStatus as any }).eq("id", id);
      if (error) throw error;
      if (newStatus === "completed") {
        await deductMaterials(treatmentName, id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tooth-treatments"] });
      toast.success("Treatment status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadgeColor: Record<string, string> = {
    healthy: "bg-emerald-100 text-emerald-800",
    decayed: "bg-orange-100 text-orange-800",
    missing: "bg-gray-200 text-gray-800",
    treated: "bg-blue-100 text-blue-800",
    needs_treatment: "bg-red-100 text-red-800",
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">Tooth #{toothNumber}</CardTitle>
          <Badge className={statusBadgeColor[currentStatus] || ""}>{currentStatus.replace("_", " ")}</Badge>
        </div>
        {/* Status selector */}
        <div className="pt-2">
          <Label className="text-xs">Change Status</Label>
          <Select value={currentStatus} onValueChange={v => updateStatus.mutate(v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TOOTH_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="conditions">
          <TabsList className="w-full">
            <TabsTrigger value="conditions" className="flex-1"><Stethoscope className="h-3 w-3 mr-1" />Conditions</TabsTrigger>
            <TabsTrigger value="treatments" className="flex-1"><Pill className="h-3 w-3 mr-1" />Treatments</TabsTrigger>
          </TabsList>

          {/* CONDITIONS TAB */}
          <TabsContent value="conditions" className="space-y-3 mt-3">
            <Button size="sm" variant="outline" onClick={() => setShowConditionForm(!showConditionForm)}>
              <Plus className="h-3 w-3 mr-1" /> Add Condition
            </Button>

            {showConditionForm && (
              <form onSubmit={e => { e.preventDefault(); addCondition.mutate(); }} className="space-y-2 p-3 rounded-lg bg-muted">
                <Select value={conditionForm.condition_name} onValueChange={v => setConditionForm(f => ({ ...f, condition_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    {COMMON_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={conditionForm.severity} onValueChange={v => setConditionForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notes..." value={conditionForm.notes} onChange={e => setConditionForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                <Button size="sm" type="submit" disabled={!conditionForm.condition_name || addCondition.isPending}>
                  {addCondition.isPending ? "Saving..." : "Save"}
                </Button>
              </form>
            )}

            {!conditions?.length ? (
              <p className="text-sm text-muted-foreground py-2">No conditions recorded</p>
            ) : conditions.map((c: any) => (
              <div key={c.id} className="p-2 rounded bg-muted space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.condition_name}</span>
                  <Badge variant="outline" className="text-xs">{c.severity}</Badge>
                </div>
                {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </TabsContent>

          {/* TREATMENTS TAB */}
          <TabsContent value="treatments" className="space-y-3 mt-3">
            <Button size="sm" variant="outline" onClick={() => setShowTreatmentForm(!showTreatmentForm)}>
              <Plus className="h-3 w-3 mr-1" /> Add Treatment
            </Button>

            {showTreatmentForm && (
              <form onSubmit={e => { e.preventDefault(); addTreatment.mutate(); }} className="space-y-2 p-3 rounded-lg bg-muted">
                <Select value={treatmentForm.treatment_name} onValueChange={v => setTreatmentForm(f => ({ ...f, treatment_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select treatment" /></SelectTrigger>
                  <SelectContent>
                    {COMMON_TREATMENTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={treatmentForm.status} onValueChange={v => setTreatmentForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Cost (₹)" value={treatmentForm.cost} onChange={e => setTreatmentForm(f => ({ ...f, cost: e.target.value }))} />
                <Textarea placeholder="Notes..." value={treatmentForm.notes} onChange={e => setTreatmentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                <Button size="sm" type="submit" disabled={!treatmentForm.treatment_name || addTreatment.isPending}>
                  {addTreatment.isPending ? "Saving..." : "Save"}
                </Button>
              </form>
            )}

            {!treatments?.length ? (
              <p className="text-sm text-muted-foreground py-2">No treatments recorded</p>
            ) : treatments.map((t: any) => (
              <div key={t.id} className="p-2 rounded bg-muted space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.treatment_name}</span>
                  <Select
                    value={t.status}
                    onValueChange={v => updateTreatmentStatus.mutate({ id: t.id, newStatus: v, treatmentName: t.treatment_name })}
                  >
                    <SelectTrigger className="h-6 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {t.cost > 0 && <p className="text-xs font-medium">₹{Number(t.cost).toLocaleString()}</p>}
                {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

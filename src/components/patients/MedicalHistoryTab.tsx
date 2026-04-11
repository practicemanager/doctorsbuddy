import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Heart, AlertTriangle, Pill, Droplets, ShieldAlert } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface MedicalHistoryTabProps {
  patientId: string;
  clinicId: string;
}

export default function MedicalHistoryTab({ patientId, clinicId }: MedicalHistoryTabProps) {
  const queryClient = useQueryClient();
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [medicationInput, setMedicationInput] = useState("");

  const [form, setForm] = useState({
    blood_group: "",
    allergies: [] as string[],
    medical_conditions: [] as string[],
    current_medications: [] as string[],
    pregnancy_status: "not_applicable",
    smoking_habits: "none",
    diabetes_status: "none",
    heart_condition: false,
    bleeding_disorders: false,
    hepatitis: false,
    hiv: false,
    epilepsy: false,
    asthma: false,
    notes: "",
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["medical-history", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_medical_history")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (history) {
      setForm({
        blood_group: history.blood_group || "",
        allergies: (history.allergies as string[]) || [],
        medical_conditions: (history.medical_conditions as string[]) || [],
        current_medications: (history.current_medications as string[]) || [],
        pregnancy_status: history.pregnancy_status || "not_applicable",
        smoking_habits: history.smoking_habits || "none",
        diabetes_status: history.diabetes_status || "none",
        heart_condition: history.heart_condition || false,
        bleeding_disorders: history.bleeding_disorders || false,
        hepatitis: history.hepatitis || false,
        hiv: history.hiv || false,
        epilepsy: history.epilepsy || false,
        asthma: history.asthma || false,
        notes: history.notes || "",
      });
    }
  }, [history]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, patient_id: patientId, clinic_id: clinicId };
      if (history) {
        const { error } = await supabase
          .from("patient_medical_history")
          .update(payload)
          .eq("id", history.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("patient_medical_history")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-history", patientId] });
      toast.success("Medical history saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTag = (field: "allergies" | "medical_conditions" | "current_medications", value: string) => {
    if (!value.trim()) return;
    setForm(f => ({ ...f, [field]: [...f[field], value.trim()] }));
  };

  const removeTag = (field: "allergies" | "medical_conditions" | "current_medications", idx: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="gap-1">
          <Save className="h-3.5 w-3.5" />
          {saveMutation.isPending ? "Saving..." : "Save Medical History"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Basic Medical Info */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Droplets className="h-4 w-4 text-destructive" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Blood Group</Label>
              <Select value={form.blood_group} onValueChange={v => setForm(f => ({ ...f, blood_group: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Pregnancy Status</Label>
              <Select value={form.pregnancy_status} onValueChange={v => setForm(f => ({ ...f, pregnancy_status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  <SelectItem value="not_pregnant">Not Pregnant</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="breastfeeding">Breastfeeding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Smoking Habits</Label>
              <Select value={form.smoking_habits} onValueChange={v => setForm(f => ({ ...f, smoking_habits: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                  <SelectItem value="former">Former Smoker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Diabetes Status</Label>
              <Select value={form.diabetes_status} onValueChange={v => setForm(f => ({ ...f, diabetes_status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="type1">Type 1</SelectItem>
                  <SelectItem value="type2">Type 2</SelectItem>
                  <SelectItem value="pre_diabetic">Pre-Diabetic</SelectItem>
                  <SelectItem value="gestational">Gestational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Critical Conditions */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" /> Critical Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "heart_condition", label: "Heart Condition / Cardiac Disease" },
              { key: "bleeding_disorders", label: "Bleeding Disorders" },
              { key: "hepatitis", label: "Hepatitis (B/C)" },
              { key: "hiv", label: "HIV / AIDS" },
              { key: "epilepsy", label: "Epilepsy / Seizures" },
              { key: "asthma", label: "Asthma / Respiratory Issues" },
            ].map(cond => (
              <div key={cond.key} className="flex items-center justify-between">
                <Label className="text-sm">{cond.label}</Label>
                <Switch
                  checked={form[cond.key as keyof typeof form] as boolean}
                  onCheckedChange={v => setForm(f => ({ ...f, [cond.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Allergies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Penicillin, Latex..."
                value={allergyInput}
                onChange={e => setAllergyInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag("allergies", allergyInput); setAllergyInput(""); } }}
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={() => { addTag("allergies", allergyInput); setAllergyInput(""); }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.allergies.map((a, i) => (
                <Badge key={i} variant="destructive" className="gap-1 cursor-pointer" onClick={() => removeTag("allergies", i)}>
                  {a} ×
                </Badge>
              ))}
              {!form.allergies.length && <p className="text-xs text-muted-foreground">No known allergies</p>}
            </div>
          </CardContent>
        </Card>

        {/* Current Medications */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" /> Current Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Aspirin 75mg daily..."
                value={medicationInput}
                onChange={e => setMedicationInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag("current_medications", medicationInput); setMedicationInput(""); } }}
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={() => { addTag("current_medications", medicationInput); setMedicationInput(""); }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.current_medications.map((m, i) => (
                <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag("current_medications", i)}>
                  {m} ×
                </Badge>
              ))}
              {!form.current_medications.length && <p className="text-xs text-muted-foreground">No current medications</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Conditions */}
      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" /> Other Medical Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Hypertension, Thyroid..."
              value={conditionInput}
              onChange={e => setConditionInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag("medical_conditions", conditionInput); setConditionInput(""); } }}
              className="h-9"
            />
            <Button size="sm" variant="outline" onClick={() => { addTag("medical_conditions", conditionInput); setConditionInput(""); }}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.medical_conditions.map((c, i) => (
              <Badge key={i} variant="outline" className="gap-1 cursor-pointer" onClick={() => removeTag("medical_conditions", i)}>
                {c} ×
              </Badge>
            ))}
            {!form.medical_conditions.length && <p className="text-xs text-muted-foreground">No conditions recorded</p>}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-card border-0">
        <CardContent className="p-4">
          <Label className="text-xs">Additional Medical Notes</Label>
          <Textarea
            className="mt-2"
            rows={3}
            placeholder="Any other relevant medical information..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

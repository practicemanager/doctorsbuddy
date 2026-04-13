import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, Trash2, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface MedicationPanelProps {
  medications: Medication[];
  treatmentPlan: string;
  onMedicationsChange: (meds: Medication[]) => void;
  onTreatmentPlanChange: (plan: string) => void;
}

const COMMON_MEDICINES = [
  // Antibiotics
  "Amoxicillin 250mg", "Amoxicillin 500mg", "Amoxicillin + Clavulanate 625mg",
  "Azithromycin 250mg", "Azithromycin 500mg",
  "Metronidazole 200mg", "Metronidazole 400mg",
  "Clindamycin 150mg", "Clindamycin 300mg",
  "Doxycycline 100mg", "Cephalexin 500mg",
  "Ciprofloxacin 500mg", "Ornidazole 500mg",
  "Amoxicillin + Metronidazole (Combi)",
  // Analgesics / NSAIDs
  "Ibuprofen 200mg", "Ibuprofen 400mg",
  "Paracetamol 500mg", "Paracetamol 650mg",
  "Diclofenac 50mg", "Diclofenac 100mg SR",
  "Aceclofenac 100mg", "Aceclofenac + Paracetamol",
  "Ketorolac 10mg", "Nimesulide 100mg",
  "Tramadol 50mg", "Ibuprofen + Paracetamol (Combiflam)",
  // Antifungals
  "Fluconazole 150mg", "Clotrimazole Mouth Paint",
  // Steroids / Anti-inflammatory
  "Prednisolone 5mg", "Prednisolone 10mg",
  "Dexamethasone 0.5mg", "Deflazacort 6mg",
  // Mouthwashes / Topical
  "Chlorhexidine Mouthwash 0.2%", "Povidone Iodine Gargle",
  "Benzocaine Gel (Topical)", "Lidocaine Gel 2%",
  "Oracure Gel", "Hexidine Mouthwash",
  "Triamcinolone Acetonide Paste (Kenacort)",
  // Antacids / GI Protection
  "Pantoprazole 40mg", "Omeprazole 20mg", "Ranitidine 150mg",
  // Anti-allergic
  "Cetirizine 10mg", "Levocetirizine 5mg", "Fexofenadine 120mg",
  // Vitamins / Supplements
  "Vitamin C 500mg", "Calcium + Vitamin D3",
  "B-Complex", "Iron + Folic Acid",
  // Dental-specific
  "Fluoride Gel (Professional)", "Desensitizing Toothpaste (Rx)",
  "Sodium Fluoride Rinse 0.05%",
];

const FREQUENCIES = [
  "Once daily (OD)", "Twice daily (BD)", "Thrice daily (TDS)",
  "Four times daily (QID)", "Every 6 hours (Q6H)", "Every 8 hours (Q8H)",
  "As needed (SOS)", "Before meals", "After meals",
  "At bedtime (HS)", "Once weekly",
];

const DURATIONS = [
  "1 day", "3 days", "5 days", "7 days", "10 days",
  "14 days", "21 days", "1 month", "2 months", "3 months", "As directed",
];

export default function MedicationPanel({ medications, treatmentPlan, onMedicationsChange, onTreatmentPlanChange }: MedicationPanelProps) {
  const [form, setForm] = useState<Medication>({ name: "", dosage: "1 tab", frequency: "Twice daily (BD)", duration: "5 days" });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredMeds = useMemo(() => {
    if (!search) return COMMON_MEDICINES;
    const q = search.toLowerCase();
    return COMMON_MEDICINES.filter(m => m.toLowerCase().includes(q));
  }, [search]);

  const addMed = () => {
    if (!form.name) return;
    onMedicationsChange([...medications, { ...form }]);
    setForm({ name: "", dosage: "1 tab", frequency: "Twice daily (BD)", duration: "5 days" });
    setSearch("");
  };

  const removeMed = (idx: number) => {
    onMedicationsChange(medications.filter((_, i) => i !== idx));
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" />
          Treatment Plan & Medication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Treatment plan */}
        <div>
          <Label className="text-xs font-semibold">Treatment Plan</Label>
          <textarea
            className="w-full mt-1 p-2 text-sm border rounded-md bg-background resize-none"
            placeholder="Describe overall treatment plan..."
            rows={2}
            value={treatmentPlan}
            onChange={e => onTreatmentPlanChange(e.target.value)}
          />
        </div>

        {/* Add medication */}
        <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Add Medicine</Label>

          {/* Drug autocomplete */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-8 justify-start text-xs font-normal" role="combobox">
                <Search className="h-3 w-3 mr-1.5 shrink-0 text-muted-foreground" />
                {form.name || "Search medicine..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Type drug name..."
                  value={search}
                  onValueChange={setSearch}
                  className="h-8 text-xs"
                />
                <CommandList className="max-h-[200px]">
                  <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
                    {search ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setForm(f => ({ ...f, name: search }));
                          setOpen(false);
                        }}
                      >
                        Use "{search}" as custom medicine
                      </Button>
                    ) : "Start typing..."}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredMeds.map(m => (
                      <CommandItem
                        key={m}
                        value={m}
                        onSelect={() => {
                          setForm(f => ({ ...f, name: m }));
                          setOpen(false);
                          setSearch("");
                        }}
                        className="text-xs cursor-pointer"
                      >
                        {m}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="grid grid-cols-3 gap-2">
            <Input className="h-8 text-xs" placeholder="Dosage" value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} />
            <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={addMed} disabled={!form.name} className="w-full">
            <Plus className="h-3 w-3 mr-1" />Add Medicine
          </Button>
        </div>

        {/* Medication list */}
        {medications.length > 0 && (
          <div className="space-y-1.5">
            {medications.map((med, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted text-xs">
                <div className="flex-1">
                  <p className="font-medium">{med.name}</p>
                  <p className="text-muted-foreground">{med.dosage} · {med.frequency} · {med.duration}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeMed(idx)}>
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

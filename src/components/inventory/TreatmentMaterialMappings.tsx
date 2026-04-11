import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Link2 } from "lucide-react";

const COMMON_TREATMENTS = ["Filling", "Root Canal (RCT)", "Crown", "Extraction", "Scaling", "Veneer", "Bridge", "Implant", "Whitening"];

export default function TreatmentMaterialMappings() {
  const { profile } = useAuth();
  const clinicId = profile?.clinic_id;
  const queryClient = useQueryClient();
  const [treatment, setTreatment] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");

  const { data: mappings = [] } = useQuery({
    queryKey: ["treatment-mappings", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from("treatment_material_mappings")
        .select("*, inventory_items(name, unit)")
        .eq("clinic_id", clinicId)
        .order("treatment_name");
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["inventory", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("inventory_items").select("id, name, unit").eq("clinic_id", clinicId).order("name");
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const addMapping = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("treatment_material_mappings").insert({
        clinic_id: clinicId!,
        treatment_name: treatment,
        inventory_item_id: itemId,
        quantity_needed: Number(qty),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-mappings"] });
      setTreatment("");
      setItemId("");
      setQty("1");
      toast.success("Material mapping added");
    },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "This mapping already exists" : e.message),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treatment_material_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-mappings"] });
      toast.success("Mapping removed");
    },
  });

  const grouped = mappings.reduce((acc: Record<string, any[]>, m: any) => {
    (acc[m.treatment_name] = acc[m.treatment_name] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Add mapping form */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Link Material to Treatment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <Select value={treatment} onValueChange={setTreatment}>
                <SelectTrigger><SelectValue placeholder="Treatment type" /></SelectTrigger>
                <SelectContent>
                  {COMMON_TREATMENTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Inventory item" /></SelectTrigger>
                <SelectContent>
                  {items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20">
              <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" />
            </div>
            <Button size="sm" onClick={() => addMapping.mutate()} disabled={!treatment || !itemId || addMapping.isPending}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing mappings grouped by treatment */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No material mappings configured yet. Link inventory items to treatments above so they auto-deduct when a treatment is completed.
        </div>
      ) : (
        Object.entries(grouped).map(([name, items]) => (
          <Card key={name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Qty per Treatment</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.inventory_items?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.quantity_needed} {m.inventory_items?.unit}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteMapping.mutate(m.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

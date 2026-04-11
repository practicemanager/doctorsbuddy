import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TreatmentSummaryTableProps {
  patientId: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planned: "outline",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
};

export default function TreatmentSummaryTable({ patientId }: TreatmentSummaryTableProps) {
  const { data: summary = [] } = useQuery({
    queryKey: ["treatment-summary", patientId],
    queryFn: async () => {
      // Get all tooth records for this patient
      const { data: records } = await supabase
        .from("tooth_records")
        .select("id, tooth_number")
        .eq("patient_id", patientId);
      if (!records?.length) return [];

      const recordIds = records.map(r => r.id);
      const toothMap = Object.fromEntries(records.map(r => [r.id, r.tooth_number]));

      // Get all treatments
      const { data: treatments } = await supabase
        .from("tooth_treatments")
        .select("*")
        .in("tooth_record_id", recordIds)
        .order("created_at", { ascending: false });

      // Get all conditions
      const { data: conditions } = await supabase
        .from("tooth_conditions")
        .select("*")
        .in("tooth_record_id", recordIds)
        .order("created_at", { ascending: false });

      // Merge into summary rows
      const rows: any[] = [];
      treatments?.forEach(t => {
        rows.push({
          id: t.id,
          date: t.created_at,
          tooth: toothMap[t.tooth_record_id],
          description: t.treatment_name,
          type: "treatment",
          status: t.status,
          cost: t.cost,
          notes: t.notes,
        });
      });
      conditions?.forEach(c => {
        rows.push({
          id: c.id,
          date: c.created_at,
          tooth: toothMap[c.tooth_record_id],
          description: c.condition_name,
          type: "condition",
          status: c.severity,
          cost: null,
          notes: c.notes,
        });
      });

      rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return rows;
    },
    enabled: !!patientId,
  });

  if (!summary.length) return null;

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[300px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-16">Tooth</TableHead>
                <TableHead className="w-20">Type</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="text-right w-20">Fees</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium text-sm">{row.description}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{row.tooth}</TableCell>
                  <TableCell>
                    <Badge variant={row.type === "treatment" ? "default" : "secondary"} className="text-xs">
                      {row.type === "treatment" ? "Tx" : "Dx"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status] || "outline"} className="text-xs capitalize">
                      {row.status?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.cost ? `₹${Number(row.cost).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {row.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

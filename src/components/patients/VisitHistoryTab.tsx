import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Pill, Stethoscope, Calendar } from "lucide-react";

interface VisitHistoryTabProps {
  patientId: string;
}

export default function VisitHistoryTab({ patientId }: VisitHistoryTabProps) {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["visit-history", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select("*, prescription_items(*)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading visit history...</p>;

  if (!prescriptions.length) {
    return (
      <Card className="shadow-card border-0">
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No visit history recorded yet. Start from the Dental Chart.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

      {prescriptions.map((rx: any, idx: number) => {
        const meds = Array.isArray(rx.medications) ? rx.medications : [];
        const items = rx.prescription_items || [];
        const totalCost = items.reduce((s: number, i: any) => s + Number(i.cost || 0), 0);

        return (
          <div key={rx.id} className="relative pl-12 pb-6">
            {/* Timeline dot */}
            <div className={`absolute left-2.5 top-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center
              ${rx.status === "confirmed" ? "bg-success border-success" : "bg-primary border-primary"}`}>
              <Stethoscope className="h-2.5 w-2.5 text-primary-foreground" />
            </div>

            <Card className="shadow-card border-0">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{new Date(rx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <Badge variant="secondary" className={rx.status === "confirmed" ? "bg-success/10 text-success" : ""}>{rx.status}</Badge>
                </div>

                {/* Chief Complaint */}
                {rx.chief_complaint && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Chief Complaint:</span>
                    <p className="text-sm">{rx.chief_complaint}</p>
                  </div>
                )}

                {/* Clinical Findings */}
                <div className="flex gap-3 flex-wrap">
                  {rx.gum_condition && rx.gum_condition !== "normal" && (
                    <Badge variant="outline" className="text-xs">Gum: {rx.gum_condition}</Badge>
                  )}
                  {rx.alignment_condition && rx.alignment_condition !== "normal" && (
                    <Badge variant="outline" className="text-xs">Alignment: {rx.alignment_condition}</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">{rx.chart_type === "kids" ? "Deciduous" : "Permanent"}</Badge>
                </div>

                {/* Tooth Findings */}
                {items.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Findings ({items.length}):</span>
                    <div className="mt-1 space-y-1">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">#{item.tooth_number}</span>
                            <span>{item.condition || "—"}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{item.treatment || "—"}</span>
                          </div>
                          {item.cost > 0 && <span className="font-medium">₹{Number(item.cost).toLocaleString()}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {meds.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Pill className="h-3 w-3" /> Medications ({meds.length}):
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {meds.map((med: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {med.name} {med.dosage}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                {totalCost > 0 && (
                  <div className="text-right text-sm font-semibold border-t pt-2">
                    Total: ₹{totalCost.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

export default function PendingTreatments() {
  const { clinicId } = useAuth();

  const { data: pendingTreatments = [] } = useQuery({
    queryKey: ["dash-pending-treatments", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("tooth_treatments")
        .select("*, tooth_records!inner(patient_id, clinic_id, tooth_number, patients(full_name))")
        .eq("tooth_records.clinic_id", clinicId!)
        .in("status", ["planned", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <FlaskConical className="h-4 w-4 text-warning" />
          Pending Treatments
          <Badge variant="outline" className="ml-auto text-xs font-normal">{pendingTreatments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!pendingTreatments.length ? (
          <p className="text-sm text-muted-foreground py-4">No pending treatments.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingTreatments.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.treatment_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.tooth_records?.patients?.full_name} — #{t.tooth_records?.tooth_number}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-xs ${t.status === "planned" ? "bg-accent text-primary" : "bg-warning/10 text-warning"}`}>
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

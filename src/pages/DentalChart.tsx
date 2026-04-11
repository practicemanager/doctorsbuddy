import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import DentalChartGrid from "@/components/dental-chart/DentalChartGrid";
import ToothDetailPanel from "@/components/dental-chart/ToothDetailPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";

export default function DentalChartPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*").eq("id", patientId!).single();
      return data;
    },
    enabled: !!patientId,
  });

  const { data: toothRecords, refetch: refetchRecords } = useQuery({
    queryKey: ["tooth-records", patientId],
    queryFn: async () => {
      const { data } = await supabase.from("tooth_records").select("*").eq("patient_id", patientId!);
      return data ?? [];
    },
    enabled: !!patientId,
  });

  const selectedRecord = toothRecords?.find((r: any) => r.tooth_number === selectedTooth);

  if (!patientId || !clinicId) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">Dental Chart</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{patient?.full_name || "Loading..."}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Chart */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="font-heading">Tooth Map</CardTitle>
            </CardHeader>
            <CardContent>
              <DentalChartGrid
                toothRecords={toothRecords ?? []}
                selectedTooth={selectedTooth}
                onSelectTooth={setSelectedTooth}
              />
            </CardContent>
          </Card>

          {/* Detail panel */}
          <div>
            {selectedTooth ? (
              <ToothDetailPanel
                patientId={patientId}
                clinicId={clinicId}
                toothNumber={selectedTooth}
                toothRecordId={selectedRecord?.id}
                currentStatus={selectedRecord?.status || "healthy"}
                onUpdate={() => refetchRecords()}
              />
            ) : (
              <Card className="shadow-card border-0">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Click on a tooth to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

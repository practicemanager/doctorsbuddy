import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import DentalChartGrid from "@/components/dental-chart/DentalChartGrid";
import ToothDetailPanel from "@/components/dental-chart/ToothDetailPanel";
import TreatmentQuickPanel from "@/components/dental-chart/TreatmentQuickPanel";
import TreatmentSummaryTable from "@/components/dental-chart/TreatmentSummaryTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Mail, Phone, Calendar } from "lucide-react";

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
      <div className="space-y-4 animate-fade-in">
        {/* Patient header bar */}
        <div className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">{patient?.full_name || "Loading..."}</h1>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {patient?.date_of_birth && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{patient.date_of_birth}</span>
                )}
                {patient?.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{patient.email}</span>
                )}
                {patient?.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{patient.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main layout: chart left, panels right */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left: Chart + Summary */}
          <div className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading">Tooth Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <DentalChartGrid
                  toothRecords={toothRecords ?? []}
                  selectedTooth={selectedTooth}
                  onSelectTooth={setSelectedTooth}
                />
              </CardContent>
            </Card>

            {/* Quick treatment panel */}
            <TreatmentQuickPanel
              patientId={patientId}
              clinicId={clinicId}
              toothNumber={selectedTooth}
              toothRecordId={selectedRecord?.id}
              onUpdate={() => refetchRecords()}
            />

            {/* Summary table */}
            <TreatmentSummaryTable patientId={patientId} />
          </div>

          {/* Right: Tooth detail panel */}
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

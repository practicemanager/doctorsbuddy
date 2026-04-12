import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Smile } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function UpNextWidget() {
  const { clinicId } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const { data: nextPatient } = useQuery({
    queryKey: ["up-next", clinicId],
    queryFn: async () => {
      // Get current in-progress or next waiting queue token
      const { data } = await supabase.from("queue_tokens")
        .select("*, patients(full_name, id)")
        .eq("clinic_id", clinicId!)
        .eq("queue_date", today)
        .in("status", ["in_progress", "waiting"])
        .order("status", { ascending: true }) // in_progress first
        .order("token_number", { ascending: true })
        .limit(1);

      if (!data?.length) return null;
      const token = data[0];

      // Get next appointment info if available
      const { data: appt } = await supabase.from("appointments")
        .select("type, duration_minutes, scheduled_at")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", token.patients?.id ?? "")
        .gte("scheduled_at", today + "T00:00:00")
        .lt("scheduled_at", today + "T23:59:59")
        .order("scheduled_at", { ascending: true })
        .limit(1);

      return {
        ...token,
        appointment: appt?.[0] ?? null,
      };
    },
    enabled: !!clinicId,
    refetchInterval: 30000,
  });

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!nextPatient?.appointment?.scheduled_at) { setCountdown(""); return; }
    const interval = setInterval(() => {
      const endTime = new Date(nextPatient.appointment.scheduled_at);
      endTime.setMinutes(endTime.getMinutes() + (nextPatient.appointment.duration_minutes || 30));
      const diff = endTime.getTime() - Date.now();
      if (diff <= 0) { setCountdown("Overdue"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}m ${secs}s remaining`);
    }, 1000);
    return () => clearInterval(interval);
  }, [nextPatient]);

  if (!nextPatient) {
    return (
      <Card className="shadow-card border-0 border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Play className="h-4 w-4 text-primary" /> UP NEXT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">No patients in queue right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-0 border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Play className="h-4 w-4 text-primary" /> UP NEXT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
            {(nextPatient.patients?.full_name || "?")[0]}
          </div>
          <div>
            <p className="font-semibold text-foreground">{nextPatient.patients?.full_name}</p>
            <p className="text-xs text-muted-foreground">Token T-{String(nextPatient.token_number).padStart(3, "0")}</p>
          </div>
          <Badge variant="secondary" className={`ml-auto text-xs ${nextPatient.status === "in_progress" ? "bg-warning/10 text-warning" : "bg-accent text-primary"}`}>
            {nextPatient.status === "in_progress" ? "In Chair" : "Waiting"}
          </Badge>
        </div>

        {nextPatient.appointment && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Smile className="h-3 w-3" /> {nextPatient.appointment.type}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {nextPatient.appointment.duration_minutes}min</span>
            {countdown && <span className="font-medium text-primary">{countdown}</span>}
          </div>
        )}

        <Button size="sm" className="w-full gap-1.5" onClick={() => navigate(`/dental-chart?patient=${nextPatient.patients?.id}`)}>
          <Smile className="h-3.5 w-3.5" /> Open Dental Chart
        </Button>
      </CardContent>
    </Card>
  );
}

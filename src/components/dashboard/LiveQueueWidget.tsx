import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function LiveQueueWidget() {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: queueToday = [] } = useQuery({
    queryKey: ["dashboard-queue", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("queue_tokens")
        .select("*, patients(full_name)")
        .eq("clinic_id", clinicId!)
        .eq("queue_date", today)
        .in("status", ["waiting", "in_progress"])
        .order("token_number", { ascending: true });
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("dashboard-queue-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "queue_tokens",
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-queue", clinicId] });
        queryClient.invalidateQueries({ queryKey: ["up-next", clinicId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId, queryClient]);

  const advanceStatus = async (token: any) => {
    const nextStatus = token.status === "waiting" ? "in_progress" : "completed";
    const updates: any = { status: nextStatus };
    if (nextStatus === "in_progress") updates.called_at = new Date().toISOString();
    if (nextStatus === "completed") updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from("queue_tokens").update(updates).eq("id", token.id);
    if (error) toast.error("Failed to update status");
    else toast.success(`Token T-${String(token.token_number).padStart(3, "0")} → ${nextStatus === "in_progress" ? "In Progress" : "Completed"}`);
  };

  const statusBadge = (status: string) => {
    if (status === "in_progress") return <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">In Chair</Badge>;
    return <Badge variant="secondary" className="text-xs">Waiting</Badge>;
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Activity className="h-4 w-4 text-primary" />
          Today's Queue
          <Badge variant="outline" className="ml-auto text-xs font-normal">{queueToday.length} active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!queueToday.length ? (
          <p className="text-sm text-muted-foreground py-4">Queue is empty.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {queueToday.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 group">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {q.token_number}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.patients?.full_name}</p>
                    <p className="text-xs text-muted-foreground">T-{String(q.token_number).padStart(3, "0")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(q.status)}
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => advanceStatus(q)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

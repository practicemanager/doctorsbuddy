import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Receipt, Megaphone, TrendingUp, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

function StatCard({ title, value, icon: Icon, trend }: {
  title: string; value: string | number; icon: any; trend?: string;
}) {
  return (
    <Card className="shadow-card border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold font-heading text-foreground">{value}</p>
            {trend && <p className="mt-1 text-xs text-success">{trend}</p>}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Icon className="h-6 w-6 text-accent-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { clinicId } = useAuth();

  const { data: patientCount } = useQuery({
    queryKey: ["patients-count", clinicId],
    queryFn: async () => {
      if (!clinicId) return 0;
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ["today-appointments", clinicId],
    queryFn: async () => {
      if (!clinicId) return 0;
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase.from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", today + "T00:00:00")
        .lt("scheduled_at", today + "T23:59:59");
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: pendingInvoices } = useQuery({
    queryKey: ["pending-invoices", clinicId],
    queryFn: async () => {
      if (!clinicId) return 0;
      const { count } = await supabase.from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .in("status", ["draft", "sent"]);
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: activeCampaigns } = useQuery({
    queryKey: ["active-campaigns", clinicId],
    queryFn: async () => {
      if (!clinicId) return 0;
      const { count } = await supabase.from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .in("status", ["draft", "scheduled"]);
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: recentAppointments } = useQuery({
    queryKey: ["recent-appointments", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("appointments")
        .select("*, patients(full_name)")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening at your clinic today.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Patients" value={patientCount ?? 0} icon={Users} />
          <StatCard title="Today's Appointments" value={todayAppointments ?? 0} icon={CalendarDays} />
          <StatCard title="Pending Invoices" value={pendingInvoices ?? 0} icon={Receipt} />
          <StatCard title="Active Campaigns" value={activeCampaigns ?? 0} icon={Megaphone} />
        </div>

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Clock className="h-5 w-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentAppointments?.length ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                    <div>
                      <p className="font-medium text-foreground">{apt.patients?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{apt.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(apt.scheduled_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

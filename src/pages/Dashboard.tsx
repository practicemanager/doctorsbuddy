import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, CalendarDays, Receipt, TrendingUp, Clock, AlertTriangle,
  CheckCircle2, Activity, IndianRupee, FlaskConical,
  UserPlus, Play, FileText, Smile, ListOrdered
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

function StatCard({ title, value, icon: Icon, subtitle, color }: {
  title: string; value: string | number; icon: any; subtitle?: string; color?: string;
}) {
  return (
    <Card className="shadow-card border-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color || "bg-accent"}`}>
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { clinicId } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const { data: patientCount = 0 } = useQuery({
    queryKey: ["patients-count", clinicId],
    queryFn: async () => {
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId!);
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: newPatientsThisMonth = 0 } = useQuery({
    queryKey: ["new-patients-month", clinicId],
    queryFn: async () => {
      const firstDay = new Date();
      firstDay.setDate(1);
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId!)
        .gte("created_at", firstDay.toISOString());
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ["today-appointments-detail", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("appointments")
        .select("*, patients(full_name, phone)")
        .eq("clinic_id", clinicId!)
        .gte("scheduled_at", today + "T00:00:00")
        .lt("scheduled_at", today + "T23:59:59")
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: pendingInvoices = 0 } = useQuery({
    queryKey: ["pending-invoices", clinicId],
    queryFn: async () => {
      const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId!).in("status", ["draft", "sent"]);
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: monthRevenue = 0 } = useQuery({
    queryKey: ["month-revenue", clinicId],
    queryFn: async () => {
      const firstDay = new Date();
      firstDay.setDate(1);
      const { data } = await supabase.from("invoices").select("amount")
        .eq("clinic_id", clinicId!).eq("status", "paid")
        .gte("paid_at", firstDay.toISOString());
      return data?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: monthExpenses = 0 } = useQuery({
    queryKey: ["month-expenses", clinicId],
    queryFn: async () => {
      const firstDay = new Date();
      firstDay.setDate(1);
      const { data } = await supabase.from("expenses").select("amount")
        .eq("clinic_id", clinicId!)
        .gte("expense_date", firstDay.toISOString().split("T")[0]);
      return data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: pendingTreatments = [] } = useQuery({
    queryKey: ["pending-treatments", clinicId],
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

  const { data: queueToday = [] } = useQuery({
    queryKey: ["queue-today", clinicId],
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

  const statusColor: Record<string, string> = {
    scheduled: "bg-accent text-accent-foreground",
    confirmed: "bg-accent text-primary",
    in_progress: "bg-warning/10 text-warning",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your clinic today & this month.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => navigate("/patients")} className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Add Walk-in
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/queue")} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Queue
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/appointments")} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Book Appointment
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/billing")} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Quick Invoice
            </Button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Today's Patients" value={todayAppointments.length} icon={CalendarDays} subtitle={`${queueToday.length} in queue`} />
          <StatCard title="Total Patients" value={patientCount} icon={Users} subtitle={`${newPatientsThisMonth} new this month`} />
          <StatCard title="Pending Invoices" value={pendingInvoices} icon={Receipt} />
          <StatCard title="Month Revenue" value={`₹${monthRevenue.toLocaleString()}`} icon={TrendingUp} />
          <StatCard title="Month Expenses" value={`₹${monthExpenses.toLocaleString()}`} icon={IndianRupee} subtitle={`Profit: ₹${(monthRevenue - monthExpenses).toLocaleString()}`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's Appointments */}
          <Card className="shadow-card border-0 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Clock className="h-4 w-4 text-primary" />
                Today's Appointments ({todayAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!todayAppointments.length ? (
                <p className="text-sm text-muted-foreground py-4">No appointments scheduled for today.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {todayAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                          {(apt.patients?.full_name || "?")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{apt.patients?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{apt.type} • {apt.patients?.phone || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-xs ${statusColor[apt.status] || ""}`}>
                          {apt.status}
                        </Badge>
                        <span className="text-xs font-medium text-foreground">
                          {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Queue Today */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Activity className="h-4 w-4 text-primary" />
                Live Queue ({queueToday.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!queueToday.length ? (
                <p className="text-sm text-muted-foreground py-4">Queue is empty.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {queueToday.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {q.token_number}
                        </span>
                        <span className="text-sm font-medium text-foreground">{q.patients?.full_name}</span>
                      </div>
                      <Badge variant="secondary" className={`text-xs ${q.status === "in_progress" ? "bg-warning/10 text-warning" : ""}`}>
                        {q.status === "in_progress" ? "In Chair" : "Waiting"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Treatments / Lab */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <FlaskConical className="h-4 w-4 text-warning" />
                Pending Treatments / Lab
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingTreatments.length ? (
                <p className="text-sm text-muted-foreground py-4">No pending treatments.</p>
              ) : (
                <div className="space-y-2">
                  {pendingTreatments.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.treatment_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.tooth_records?.patients?.full_name} — Tooth #{t.tooth_records?.tooth_number}
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

          {/* Financials Summary */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <TrendingUp className="h-4 w-4 text-success" />
                This Month's Financials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gross Revenue</span>
                  <span className="text-sm font-semibold text-foreground">₹{monthRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <span className="text-sm font-semibold text-destructive">₹{monthExpenses.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Net Profit</span>
                  <span className={`text-lg font-bold ${(monthRevenue - monthExpenses) >= 0 ? "text-success" : "text-destructive"}`}>
                    ₹{(monthRevenue - monthExpenses).toLocaleString()}
                  </span>
                </div>
                {monthRevenue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Profit Margin</span>
                    <span className="text-xs font-medium text-foreground">
                      {((((monthRevenue - monthExpenses) / monthRevenue) * 100)).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

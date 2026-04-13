import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Download, Users, CalendarDays, AlertTriangle, UserX, Activity, Heart } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const COLORS = [
  "hsl(199,89%,48%)", "hsl(172,66%,50%)", "hsl(38,92%,50%)",
  "hsl(0,84%,60%)", "hsl(152,69%,40%)", "hsl(280,60%,50%)",
  "hsl(330,70%,50%)", "hsl(210,70%,55%)",
];

export default function ReportsPage() {
  const { clinicId } = useAuth();
  const [period, setPeriod] = useState("6");

  // ─── DATA QUERIES ─────────────────────────────────────────
  const { data: invoices = [] } = useQuery({
    queryKey: ["report-invoices", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("amount, status, paid_at, created_at, patient_id")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["report-appointments", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("status, scheduled_at, type, provider_id, patient_id")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["report-expenses", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("amount, category, expense_date, gst_amount")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["report-treatments", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tooth_treatments")
        .select("treatment_name, cost, status, performed_by, created_at, tooth_record_id")
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["report-patients", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, created_at, full_name")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["report-profiles", clinicId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const doctorMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { m[p.id] = p.full_name; });
    return m;
  }, [profiles]);

  const n = parseInt(period);

  // ─── REVENUE BY MONTH (bar chart) ──────────────────────────
  const monthlyRevenue = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { month: d.toLocaleString("default", { month: "short", year: "2-digit" }), revenue: 0, expenses: 0, profit: 0 };
    }
    invoices.forEach((inv: any) => {
      const key = (inv.paid_at || inv.created_at)?.substring(0, 7);
      if (months[key] && inv.status === "paid") months[key].revenue += Number(inv.amount);
    });
    expenses.forEach((exp: any) => {
      const key = exp.expense_date?.substring(0, 7);
      if (months[key]) months[key].expenses += Number(exp.amount);
    });
    Object.values(months).forEach(m => { m.profit = m.revenue - m.expenses; });
    return Object.values(months);
  }, [invoices, expenses, n]);

  // ─── APPOINTMENTS BY TYPE (pie) ────────────────────────────
  const appointmentsByType = useMemo(() => {
    const types: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const t = a.type || "General";
      types[t] = (types[t] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  // ─── NEW VS RETURNING PATIENTS (line) ──────────────────────
  const newVsReturning = useMemo(() => {
    const now = new Date();
    const months: Record<string, { month: string; new: number; returning: number }> = {};
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { month: d.toLocaleString("default", { month: "short", year: "2-digit" }), new: 0, returning: 0 };
    }
    // Patients created in this month = new, appointments by patients created before = returning
    const patientCreated: Record<string, string> = {};
    patients.forEach((p: any) => { patientCreated[p.id] = p.created_at?.substring(0, 7); });
    appointments.forEach((a: any) => {
      const key = a.scheduled_at?.substring(0, 7);
      if (!months[key]) return;
      const pCreated = patientCreated[a.patient_id];
      if (pCreated === key) months[key].new++;
      else months[key].returning++;
    });
    return Object.values(months);
  }, [appointments, patients, n]);

  // ─── TOP 5 TREATMENTS ─────────────────────────────────────
  const topTreatments = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    treatments.forEach((t: any) => {
      const name = t.treatment_name;
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 };
      map[name].count++;
      map[name].revenue += Number(t.cost || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [treatments]);

  // ─── DOCTOR PRODUCTIVITY ──────────────────────────────────
  const doctorProductivity = useMemo(() => {
    const map: Record<string, { name: string; appointments: number; treatments: number; revenue: number }> = {};
    appointments.forEach((a: any) => {
      const id = a.provider_id;
      if (!id) return;
      if (!map[id]) map[id] = { name: doctorMap[id] || "Unknown", appointments: 0, treatments: 0, revenue: 0 };
      map[id].appointments++;
    });
    treatments.forEach((t: any) => {
      const id = t.performed_by;
      if (!id) return;
      if (!map[id]) map[id] = { name: doctorMap[id] || "Unknown", appointments: 0, treatments: 0, revenue: 0 };
      map[id].treatments++;
      map[id].revenue += Number(t.cost || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [appointments, treatments, doctorMap]);

  // ─── NO-SHOW TRACKING ────────────────────────────────────
  const noShowData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentAppts = appointments.filter((a: any) => new Date(a.scheduled_at) >= thirtyDaysAgo);
    const noShows30 = recentAppts.filter((a: any) => a.status === "no_show").length;
    const rate30 = recentAppts.length > 0 ? ((noShows30 / recentAppts.length) * 100).toFixed(1) : "0.0";

    // Weekly trend
    const weeks: Record<string, { week: string; rate: number; total: number; noShows: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const wStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const key = `W${12 - i}`;
      weeks[key] = { week: key, rate: 0, total: 0, noShows: 0 };
    }
    // Simplified: group by week index
    appointments.forEach((a: any) => {
      const d = new Date(a.scheduled_at);
      const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 12) {
        const key = `W${12 - weeksAgo}`;
        if (weeks[key]) {
          weeks[key].total++;
          if (a.status === "no_show") weeks[key].noShows++;
        }
      }
    });
    Object.values(weeks).forEach(w => { w.rate = w.total > 0 ? Math.round((w.noShows / w.total) * 100) : 0; });

    // Per-doctor breakdown
    const docNoShow: Record<string, { name: string; total: number; noShows: number; rate: string }> = {};
    appointments.forEach((a: any) => {
      const id = a.provider_id;
      if (!id) return;
      if (!docNoShow[id]) docNoShow[id] = { name: doctorMap[id] || "Unknown", total: 0, noShows: 0, rate: "0" };
      docNoShow[id].total++;
      if (a.status === "no_show") docNoShow[id].noShows++;
    });
    Object.values(docNoShow).forEach(d => { d.rate = d.total > 0 ? ((d.noShows / d.total) * 100).toFixed(1) : "0"; });

    return { rate30, noShows30, total30: recentAppts.length, weeklyTrend: Object.values(weeks), perDoctor: Object.values(docNoShow) };
  }, [appointments, doctorMap]);

  // ─── PATIENT LTV ──────────────────────────────────────────
  const ltvData = useMemo(() => {
    const patientRevenue: Record<string, { name: string; total: number; visits: number; firstVisit: string }> = {};
    patients.forEach((p: any) => {
      patientRevenue[p.id] = { name: p.full_name, total: 0, visits: 0, firstVisit: p.created_at };
    });
    invoices.forEach((inv: any) => {
      if (inv.status === "paid" && patientRevenue[inv.patient_id]) {
        patientRevenue[inv.patient_id].total += Number(inv.amount);
        patientRevenue[inv.patient_id].visits++;
      }
    });

    const allPatients = Object.values(patientRevenue);
    const sorted = [...allPatients].sort((a, b) => b.total - a.total);
    const top20Pct = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));

    const avgSpend = allPatients.length > 0
      ? allPatients.reduce((s, p) => s + (p.visits > 0 ? p.total / p.visits : 0), 0) / allPatients.filter(p => p.visits > 0).length || 0
      : 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    // At-risk: created > 6 months ago and no paid invoices in last 6 months
    const atRisk = allPatients.filter(p => {
      const created = new Date(p.firstVisit);
      return created < sixMonthsAgo && p.visits === 0;
    });

    // Cohort by year of first visit
    const cohorts: Record<string, { year: string; patients: number; totalRevenue: number; avgLTV: number }> = {};
    allPatients.forEach(p => {
      const year = p.firstVisit?.substring(0, 4) || "Unknown";
      if (!cohorts[year]) cohorts[year] = { year, patients: 0, totalRevenue: 0, avgLTV: 0 };
      cohorts[year].patients++;
      cohorts[year].totalRevenue += p.total;
    });
    Object.values(cohorts).forEach(c => { c.avgLTV = c.patients > 0 ? Math.round(c.totalRevenue / c.patients) : 0; });

    return { top20Pct, avgSpend: Math.round(avgSpend), atRisk, cohorts: Object.values(cohorts).sort((a, b) => a.year.localeCompare(b.year)) };
  }, [patients, invoices]);

  // ─── TOTALS ───────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
    const totalExpenses = monthlyRevenue.reduce((s, m) => s + m.expenses, 0);
    return { totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses };
  }, [monthlyRevenue]);

  const exportCSV = () => {
    const headers = ["Month", "Revenue", "Expenses", "Profit"];
    const rows = monthlyRevenue.map(m => [m.month, m.revenue, m.expenses, m.profit]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clinic-reports.csv";
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm">Comprehensive practice performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Revenue", value: `₹${totals.totalRevenue.toLocaleString()}`, color: "text-foreground" },
            { label: "Net Profit", value: `₹${totals.profit.toLocaleString()}`, color: totals.profit >= 0 ? "text-success" : "text-destructive" },
            { label: "No-Show Rate (30d)", value: `${noShowData.rate30}%`, color: parseFloat(noShowData.rate30) > 10 ? "text-destructive" : "text-foreground" },
            { label: "Total Patients", value: patients.length.toString(), color: "text-foreground" },
            { label: "Avg Spend/Visit", value: `₹${ltvData.avgSpend.toLocaleString()}`, color: "text-foreground" },
          ].map((kpi, i) => (
            <Card key={i} className="shadow-card border-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-xl font-bold font-heading mt-1 ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabbed Sections */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="revenue"><BarChart3 className="h-4 w-4 mr-1" />Revenue</TabsTrigger>
            <TabsTrigger value="clinical"><Activity className="h-4 w-4 mr-1" />Clinical</TabsTrigger>
            <TabsTrigger value="noshow"><UserX className="h-4 w-4 mr-1" />No-Shows</TabsTrigger>
            <TabsTrigger value="doctors"><Users className="h-4 w-4 mr-1" />Doctors</TabsTrigger>
            <TabsTrigger value="ltv"><Heart className="h-4 w-4 mr-1" />Patient LTV</TabsTrigger>
          </TabsList>

          {/* ── REVENUE TAB ── */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="shadow-card border-0 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">Revenue by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(152,69%,40%)" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="hsl(0,84%,60%)" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">P&L Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold font-heading">₹{totals.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-xl font-bold font-heading text-destructive">₹{totals.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={`text-xl font-bold font-heading ${totals.profit >= 0 ? "text-success" : "text-destructive"}`}>
                      ₹{totals.profit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-medium">
                        {totals.totalRevenue > 0 ? ((totals.profit / totals.totalRevenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, totals.totalRevenue > 0 ? (totals.profit / totals.totalRevenue) * 100 : 0))}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly table */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyRevenue.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell>₹{m.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-destructive">₹{m.expenses.toLocaleString()}</TableCell>
                        <TableCell className={m.profit >= 0 ? "text-success" : "text-destructive"}>₹{m.profit.toLocaleString()}</TableCell>
                        <TableCell>{m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0"}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CLINICAL TAB ── */}
          <TabsContent value="clinical" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Appointments by type pie */}
              <Card className="shadow-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">Appointments by Treatment Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointmentsByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={appointmentsByType} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {appointmentsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground py-12 text-center">No appointment data</p>}
                </CardContent>
              </Card>

              {/* New vs Returning */}
              <Card className="shadow-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">New vs Returning Patients</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={newVsReturning}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="new" stroke="hsl(199,89%,48%)" name="New" strokeWidth={2} />
                      <Line type="monotone" dataKey="returning" stroke="hsl(152,69%,40%)" name="Returning" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top 5 Treatments */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Top 5 Treatments by Volume & Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {topTreatments.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topTreatments} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => name === "revenue" ? `₹${v.toLocaleString()}` : v} />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(199,89%,48%)" name="Count" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="revenue" fill="hsl(38,92%,50%)" name="Revenue (₹)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-12 text-center">No treatment data</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NO-SHOW TAB ── */}
          <TabsContent value="noshow" className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="shadow-card border-0">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-xs text-muted-foreground">30-Day No-Show Rate</p>
                  </div>
                  <p className={`text-3xl font-bold font-heading ${parseFloat(noShowData.rate30) > 10 ? "text-destructive" : "text-foreground"}`}>
                    {noShowData.rate30}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{noShowData.noShows30} of {noShowData.total30} appointments</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-0 sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">No-Show Rate by Week (12 weeks)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={noShowData.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="rate" fill="hsl(0,84%,60%)" name="No-Show %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Per-Doctor No-Show Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Total Appts</TableHead>
                      <TableHead>No-Shows</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {noShowData.perDoctor.length > 0 ? noShowData.perDoctor.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.total}</TableCell>
                        <TableCell>{d.noShows}</TableCell>
                        <TableCell>
                          <Badge variant={parseFloat(d.rate) > 10 ? "destructive" : "secondary"}>{d.rate}%</Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCTORS TAB ── */}
          <TabsContent value="doctors" className="space-y-6">
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Doctor-Wise Productivity</CardTitle>
              </CardHeader>
              <CardContent>
                {doctorProductivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={doctorProductivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="appointments" fill="hsl(199,89%,48%)" name="Appointments" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="treatments" fill="hsl(152,69%,40%)" name="Treatments" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-12 text-center">No doctor data available</p>}
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Doctor Performance Table</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Appointments</TableHead>
                      <TableHead>Treatments</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorProductivity.length > 0 ? doctorProductivity.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.appointments}</TableCell>
                        <TableCell>{d.treatments}</TableCell>
                        <TableCell>₹{d.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PATIENT LTV TAB ── */}
          <TabsContent value="ltv" className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="shadow-card border-0">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Avg Spend / Visit</p>
                  <p className="text-2xl font-bold font-heading mt-1">₹{ltvData.avgSpend.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-0">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">At-Risk Patients</p>
                  <p className="text-2xl font-bold font-heading mt-1 text-destructive">{ltvData.atRisk.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">No visits in 6+ months</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-0">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">High-Value Patients</p>
                  <p className="text-2xl font-bold font-heading mt-1">{ltvData.top20Pct.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Top 20% by revenue</p>
                </CardContent>
              </Card>
            </div>

            {/* Cohort chart */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">LTV Cohort by Year of First Visit</CardTitle>
              </CardHeader>
              <CardContent>
                {ltvData.cohorts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ltvData.cohorts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => name === "avgLTV" ? `₹${v.toLocaleString()}` : v} />
                      <Legend />
                      <Bar dataKey="patients" fill="hsl(199,89%,48%)" name="Patients" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgLTV" fill="hsl(38,92%,50%)" name="Avg LTV (₹)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-12 text-center">No cohort data</p>}
              </CardContent>
            </Card>

            {/* High-value patient table */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">High-Value Patients (Top 20%)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Avg / Visit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ltvData.top20Pct.length > 0 ? ltvData.top20Pct.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>₹{p.total.toLocaleString()}</TableCell>
                        <TableCell>{p.visits}</TableCell>
                        <TableCell>₹{p.visits > 0 ? Math.round(p.total / p.visits).toLocaleString() : 0}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* At-risk patients */}
            {ltvData.atRisk.length > 0 && (
              <Card className="shadow-card border-0 border-l-4 border-l-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    At-Risk Patients (No Visit in 6+ Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ltvData.atRisk.slice(0, 20).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{p.name}</Badge>
                    ))}
                    {ltvData.atRisk.length > 20 && (
                      <Badge variant="secondary" className="text-xs">+{ltvData.atRisk.length - 20} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

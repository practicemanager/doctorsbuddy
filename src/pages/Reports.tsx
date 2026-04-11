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
import { BarChart3, TrendingUp, Download, IndianRupee, Users, CalendarDays, AlertTriangle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(199,89%,48%)", "hsl(172,66%,50%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(152,69%,40%)", "hsl(280,60%,50%)"];

export default function ReportsPage() {
  const { clinicId } = useAuth();
  const [period, setPeriod] = useState("6");

  const { data: invoices = [] } = useQuery({
    queryKey: ["report-invoices", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("amount, status, paid_at, created_at")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["report-expenses", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("amount, category, expense_date, gst_amount")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["report-appointments", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("status, scheduled_at")
        .eq("clinic_id", clinicId!);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; expenses: number; profit: number; invoices: number; noShows: number }> = {};
    const now = new Date();
    const n = parseInt(period);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { month: d.toLocaleString("default", { month: "short" }), revenue: 0, expenses: 0, profit: 0, invoices: 0, noShows: 0 };
    }
    invoices.forEach((inv: any) => {
      const d = inv.paid_at || inv.created_at;
      const key = d?.substring(0, 7);
      if (months[key]) {
        if (inv.status === "paid") months[key].revenue += Number(inv.amount);
        months[key].invoices++;
      }
    });
    expenses.forEach((exp: any) => {
      const key = exp.expense_date?.substring(0, 7);
      if (months[key]) months[key].expenses += Number(exp.amount);
    });
    appointments.forEach((apt: any) => {
      const key = apt.scheduled_at?.substring(0, 7);
      if (months[key] && apt.status === "no_show") months[key].noShows++;
    });
    Object.values(months).forEach(m => { m.profit = m.revenue - m.expenses; });
    return Object.values(months);
  }, [invoices, expenses, appointments, period]);

  const totals = useMemo(() => {
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    const totalNoShows = monthlyData.reduce((s, m) => s + m.noShows, 0);
    const totalInvoices = monthlyData.reduce((s, m) => s + m.invoices, 0);
    const totalGST = expenses.reduce((s: number, e: any) => s + Number(e.gst_amount || 0), 0);
    return { totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses, totalNoShows, totalInvoices, totalGST };
  }, [monthlyData, expenses]);

  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const margin = totals.totalRevenue > 0 ? ((totals.profit / totals.totalRevenue) * 100).toFixed(1) : "0.0";

  const exportCSV = () => {
    const headers = ["Month", "Revenue", "Expenses", "Profit", "Margin", "Invoices"];
    const rows = monthlyData.map(m => [m.month, m.revenue, m.expenses, m.profit, m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) + "%" : "0%", m.invoices]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "reports.csv"; a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive practice performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold font-heading mt-1">₹{totals.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className={`text-2xl font-bold font-heading mt-1 ${totals.profit >= 0 ? "text-success" : "text-destructive"}`}>₹{totals.profit.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">No-Show Rate</p>
              <p className="text-2xl font-bold font-heading mt-1">{appointments.length > 0 ? ((totals.totalNoShows / appointments.length) * 100).toFixed(1) : 0}%</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold font-heading mt-1">{totals.totalInvoices}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">GST Collected</p>
              <p className="text-2xl font-bold font-heading mt-1">₹{totals.totalGST.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card border-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Revenue Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(152,69%,40%)" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(0,84%,60%)" name="Expenses" strokeWidth={2} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="profit" stroke="hsl(199,89%,48%)" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Gross Revenue</p>
                <p className="text-xl font-bold font-heading">₹{totals.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold font-heading text-destructive">₹{totals.totalExpenses.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className={`text-xl font-bold font-heading ${totals.profit >= 0 ? "text-success" : "text-destructive"}`}>₹{totals.profit.toLocaleString()}</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Profit Margin</span>
                  <span className="font-medium">{margin}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, parseFloat(margin)))}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown + Monthly Table */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Expense by Category</CardTitle></CardHeader>
            <CardContent>
              {expenseByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">No expense data</p>}
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Monthly Performance Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map(m => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell>₹{m.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">₹{m.expenses.toLocaleString()}</TableCell>
                      <TableCell className={m.profit >= 0 ? "text-success" : "text-destructive"}>₹{m.profit.toLocaleString()}</TableCell>
                      <TableCell>{m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0"}%</TableCell>
                      <TableCell>{m.invoices}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, isWithinInterval } from "date-fns";
import { Plus, TrendingUp, TrendingDown, IndianRupee, Download, Trash2, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";

const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Lab Costs", "Materials", "Utilities", "Marketing", "Equipment", "Insurance", "Maintenance", "Miscellaneous"];
const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "card", "cheque"];
const GST_RATES = [0, 5, 12, 18, 28];
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];

export default function FinancePage() {
  const { clinicId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<"today" | "month">("month");
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [form, setForm] = useState({ category: "General", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd"), payment_method: "cash", vendor_name: "", gst_rate: "18", reference_number: "", notes: "" });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase.from("expenses").select("*").eq("clinic_id", clinicId).order("expense_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-finance", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase.from("invoices").select("*").eq("clinic_id", clinicId).eq("status", "paid");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        clinic_id: clinicId!,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        payment_method: form.payment_method,
        vendor_name: form.vendor_name || null,
        gst_rate: Number(form.gst_rate),
        reference_number: form.reference_number || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      setForm({ category: "General", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd"), payment_method: "cash", vendor_name: "", gst_rate: "18", reference_number: "", notes: "" });
      toast.success("Expense added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Deleted"); },
  });

  const getInterval = () => {
    if (period === "today") return { start: startOfDay(new Date()), end: endOfDay(new Date()) };
    const monthDate = parseISO(`${selectedMonth}-01`);
    return { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
  };

  const { filteredExpenses, filteredRevenue, totalExpense, totalRevenue, totalGST, profit } = useMemo(() => {
    const interval = getInterval();
    const fExp = expenses.filter((e: any) => isWithinInterval(parseISO(e.expense_date), interval));
    const fRev = invoices.filter((i: any) => i.paid_at && isWithinInterval(parseISO(i.paid_at), interval));
    const tExp = fExp.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const tRev = fRev.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const tGST = fExp.reduce((s: number, e: any) => s + Number(e.gst_amount || 0), 0);
    return { filteredExpenses: fExp, filteredRevenue: fRev, totalExpense: tExp, totalRevenue: tRev, totalGST: tGST, profit: tRev - tExp };
  }, [expenses, invoices, period, selectedMonth]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e: any) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const dailyChart = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; expense: number }> = {};
    filteredRevenue.forEach((i: any) => {
      const d = format(parseISO(i.paid_at), "dd MMM");
      if (!map[d]) map[d] = { date: d, revenue: 0, expense: 0 };
      map[d].revenue += Number(i.amount);
    });
    filteredExpenses.forEach((e: any) => {
      const d = format(parseISO(e.expense_date), "dd MMM");
      if (!map[d]) map[d] = { date: d, revenue: 0, expense: 0 };
      map[d].expense += Number(e.amount);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRevenue, filteredExpenses]);

  const exportCSV = () => {
    const rows = [["Date", "Type", "Description", "Amount", "GST Rate", "GST Amount", "Category", "Payment Method"]];
    filteredRevenue.forEach((i: any) => rows.push([i.paid_at, "Revenue", "Invoice Payment", i.amount, "18", (Number(i.amount) * 0.18).toFixed(2), "Revenue", "-"]));
    filteredExpenses.forEach((e: any) => rows.push([e.expense_date, "Expense", e.description, e.amount, e.gst_rate, e.gst_amount, e.category, e.payment_method]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GST-ready report exported");
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Finance</h1>
            <p className="text-muted-foreground text-sm">Revenue, expenses & profit tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {period === "month" && (
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40" />
            )}
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export GST</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Expense</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Category</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  </div>
                  <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
                    <div><Label>Payment</Label>
                      <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace("_", " ").toUpperCase()}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>GST Rate (%)</Label>
                      <Select value={form.gst_rate} onValueChange={v => setForm(f => ({ ...f, gst_rate: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Vendor</Label><Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} placeholder="Optional" /></div>
                  </div>
                  <div><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Bill/Receipt No." /></div>
                  <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button onClick={() => addExpense.mutate()} disabled={!form.description || !form.amount || addExpense.isPending}>Save Expense</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold text-foreground">{fmt(totalRevenue)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="h-5 w-5 text-destructive" /></div><div><p className="text-xs text-muted-foreground">Expenses</p><p className="text-xl font-bold text-foreground">{fmt(totalExpense)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg" style={{ background: profit >= 0 ? "hsl(var(--primary)/0.1)" : "hsl(var(--destructive)/0.1)" }}><IndianRupee className="h-5 w-5" style={{ color: profit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }} /></div><div><p className="text-xs text-muted-foreground">Net Profit</p><p className={`text-xl font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(profit)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/50"><PieChart className="h-5 w-5 text-accent-foreground" /></div><div><p className="text-xs text-muted-foreground">GST (Expenses)</p><p className="text-xl font-bold text-foreground">{fmt(totalGST)}</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Daily Revenue vs Expense chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Revenue vs Expenses</CardTitle></CardHeader>
              <CardContent>
                {dailyChart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data for this period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expense by Category Pie */}
            {categoryBreakdown.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Expense by Category</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <RPieChart>
                      <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                    </RPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardContent className="pt-6">
                {filteredExpenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No expenses recorded for this period</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{format(parseISO(e.expense_date), "dd MMM yyyy")}</TableCell>
                          <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                          <TableCell className="text-sm">{e.description}</TableCell>
                          <TableCell className="font-medium">{fmt(Number(e.amount))}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmt(Number(e.gst_amount || 0))} ({e.gst_rate}%)</TableCell>
                          <TableCell className="text-sm capitalize">{e.payment_method?.replace("_", " ")}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => deleteExpense.mutate(e.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Receipt, FileText } from "lucide-react";
import InvoiceReceipt from "@/components/billing/InvoiceReceipt";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info",
  paid: "bg-success/10 text-success",
  overdue: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function BillingPage() {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<any>(null);
  const [form, setForm] = useState({ patient_id: "", amount: "", due_date: "", notes: "" });

  const { data: patients } = useQuery({
    queryKey: ["patients-list", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("patients").select("id, full_name").eq("clinic_id", clinicId).order("full_name");
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("invoices")
        .select("*, patients(full_name)")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: clinic } = useQuery({
    queryKey: ["clinic", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("*").eq("id", clinicId!).single();
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["invoice-items", receiptInvoice?.id],
    queryFn: async () => {
      if (!receiptInvoice?.id) return [];
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", receiptInvoice.id);
      return data ?? [];
    },
    enabled: !!receiptInvoice?.id,
  });

  const addInvoice = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("No clinic");
      const { error } = await supabase.from("invoices").insert({
        clinic_id: clinicId,
        patient_id: form.patient_id,
        amount: parseFloat(form.amount),
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setOpen(false);
      setForm({ patient_id: "", amount: "", due_date: "", notes: "" });
      toast.success("Invoice created!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "paid") update.paid_at = new Date().toISOString();
      const { error } = await supabase.from("invoices").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice updated!");
    },
  });

  const totalPending = invoices?.filter(i => ["draft", "sent"].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0) ?? 0;
  const totalPaid = invoices?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Billing</h1>
            <p className="text-muted-foreground">Track invoices and payments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); addInvoice.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients?.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={addInvoice.isPending || !form.patient_id}>
                  {addInvoice.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-bold font-heading text-warning">${totalPending.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="mt-1 text-2xl font-bold font-heading text-success">${totalPaid.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card border-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !invoices?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices yet</TableCell></TableRow>
                ) : invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.patients?.full_name}</TableCell>
                    <TableCell>₹{Number(inv.amount).toLocaleString()}</TableCell>
                    <TableCell>{inv.due_date || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[inv.status] || ""} variant="secondary">{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={inv.status} onValueChange={v => updateStatus.mutate({ id: inv.id, status: v })}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["draft", "sent", "paid", "overdue", "cancelled"].map(s =>
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                        onClick={() => setReceiptInvoice(inv)}>
                        <FileText className="h-3 w-3" /> Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Receipt Dialog */}
        <Dialog open={!!receiptInvoice} onOpenChange={open => { if (!open) setReceiptInvoice(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
            {receiptInvoice && (
              <InvoiceReceipt
                invoice={receiptInvoice}
                clinic={clinic}
                patient={receiptInvoice.patients}
                items={invoiceItems}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import InvoiceReceipt from "@/components/billing/InvoiceReceipt";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  paid: "bg-success/10 text-success",
  overdue: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function BillingPage() {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<any>(null);
  const [form, setForm] = useState({
    patient_id: "", due_date: "", notes: "",
    discount_amount: "0", discount_percent: "0", coupon_code: "", tax_rate: "0",
  });
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  const { data: patients } = useQuery({
    queryKey: ["patients-list", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("patients").select("id, full_name, phone, date_of_birth").eq("clinic_id", clinicId).order("full_name");
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  // Fetch completed treatments for selected patient (not yet invoiced)
  const { data: completedTreatments = [] } = useQuery({
    queryKey: ["completed-treatments", form.patient_id],
    queryFn: async () => {
      if (!form.patient_id) return [];
      const { data: records } = await supabase.from("tooth_records")
        .select("id, tooth_number").eq("patient_id", form.patient_id);
      if (!records?.length) return [];
      const { data: treatments } = await supabase.from("tooth_treatments")
        .select("*")
        .in("tooth_record_id", records.map(r => r.id))
        .eq("status", "completed" as any)
        .order("performed_at", { ascending: false });
      const toothMap = Object.fromEntries(records.map(r => [r.id, r.tooth_number]));
      return (treatments ?? []).map(t => ({
        ...t,
        tooth_number: toothMap[t.tooth_record_id],
      }));
    },
    enabled: !!form.patient_id,
  });

  // Reset selections when patient changes
  useEffect(() => { setSelectedTreatments([]); }, [form.patient_id]);

  const subtotal = selectedTreatments.reduce((sum, id) => {
    const t = completedTreatments.find((ct: any) => ct.id === id);
    return sum + (t ? Number(t.cost || 0) : 0);
  }, 0);
  const discountAmt = Number(form.discount_amount) || 0;
  const discountPct = Number(form.discount_percent) || 0;
  const discountTotal = discountAmt + (subtotal * discountPct / 100);
  const afterDiscount = Math.max(0, subtotal - discountTotal);
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = afterDiscount * taxRate / 100;
  const finalAmount = afterDiscount + taxAmount;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("invoices")
        .select("*, patients(full_name, phone, date_of_birth)")
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
      if (!selectedTreatments.length && !subtotal) throw new Error("Select at least one treatment or enter an amount");

      // Create invoice
      const { data: inv, error } = await supabase.from("invoices").insert({
        clinic_id: clinicId,
        patient_id: form.patient_id,
        amount: finalAmount,
        subtotal: subtotal,
        discount_amount: discountAmt,
        discount_percent: discountPct,
        coupon_code: form.coupon_code || null,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        due_date: form.due_date || null,
        notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;

      // Create invoice items from selected treatments
      if (selectedTreatments.length && inv) {
        const items = selectedTreatments.map(tId => {
          const t = completedTreatments.find((ct: any) => ct.id === tId);
          return {
            invoice_id: inv.id,
            description: `${t?.treatment_name} (Tooth #${t?.tooth_number})`,
            quantity: 1,
            unit_price: Number(t?.cost || 0),
          };
        });
        const { error: itemErr } = await supabase.from("invoice_items").insert(items);
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setOpen(false);
      setForm({ patient_id: "", due_date: "", notes: "", discount_amount: "0", discount_percent: "0", coupon_code: "", tax_rate: "0" });
      setSelectedTreatments([]);
      toast.success("Invoice created with treatment breakdown!");
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

  const selectedPatient = patients?.find(p => p.id === form.patient_id);
  const patientAge = selectedPatient?.date_of_birth
    ? Math.floor((Date.now() - new Date(selectedPatient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

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
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); addInvoice.mutate(); }} className="space-y-4">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients?.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Patient Info */}
                {selectedPatient && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                    <p><strong>Patient:</strong> {selectedPatient.full_name}</p>
                    {patientAge && <p><strong>Age:</strong> {patientAge} years</p>}
                    {selectedPatient.phone && <p><strong>Mobile:</strong> {selectedPatient.phone}</p>}
                  </div>
                )}

                {/* Completed Treatments */}
                {form.patient_id && completedTreatments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Completed Treatments</Label>
                    <div className="border rounded-md max-h-[200px] overflow-y-auto">
                      {completedTreatments.map((t: any) => (
                        <label key={t.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0">
                          <Checkbox
                            checked={selectedTreatments.includes(t.id)}
                            onCheckedChange={(checked) => {
                              setSelectedTreatments(prev =>
                                checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                              );
                            }}
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{t.treatment_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">Tooth #{t.tooth_number}</span>
                          </div>
                          <span className="text-sm font-medium">₹{Number(t.cost || 0).toLocaleString()}</span>
                        </label>
                      ))}
                    </div>
                    {selectedTreatments.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedTreatments.length} treatments selected · Subtotal: ₹{subtotal.toLocaleString()}</p>
                    )}
                  </div>
                )}

                {form.patient_id && !completedTreatments.length && (
                  <p className="text-xs text-muted-foreground">No completed treatments to invoice for this patient.</p>
                )}

                {/* Discount & Tax */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Discount (₹)</Label>
                    <Input type="number" step="0.01" value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Discount (%)</Label>
                    <Input type="number" step="0.01" max="100" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tax (%)</Label>
                    <Input type="number" step="0.01" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Coupon Code</Label>
                    <Input placeholder="e.g. SMILE10" value={form.coupon_code} onChange={e => setForm(f => ({ ...f, coupon_code: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>

                {/* Cost Breakdown */}
                {selectedTreatments.length > 0 && (
                  <div className="rounded-md border p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                    {discountTotal > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-₹{discountTotal.toLocaleString()}</span></div>}
                    {taxAmount > 0 && <div className="flex justify-between"><span>Tax ({taxRate}%)</span><span>₹{taxAmount.toLocaleString()}</span></div>}
                    <div className="flex justify-between font-bold border-t pt-1"><span>Total Payable</span><span>₹{finalAmount.toLocaleString()}</span></div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <Button type="submit" className="w-full" disabled={addInvoice.isPending || !form.patient_id || !selectedTreatments.length}>
                  {addInvoice.isPending ? "Creating..." : `Create Invoice · ₹${finalAmount.toLocaleString()}`}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-bold font-heading text-warning">₹{totalPending.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="mt-1 text-2xl font-bold font-heading text-success">₹{totalPaid.toLocaleString()}</p>
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
                  <TableHead>Discount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !invoices?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices yet</TableCell></TableRow>
                ) : invoices.map((inv: any) => {
                  const discount = Number(inv.discount_amount || 0) + (Number(inv.subtotal || 0) * Number(inv.discount_percent || 0) / 100);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{inv.patients?.full_name}</span>
                          {inv.patients?.phone && <p className="text-xs text-muted-foreground">{inv.patients.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">₹{Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {discount > 0 ? `₹${discount.toLocaleString()}` : "—"}
                      </TableCell>
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
                  );
                })}
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

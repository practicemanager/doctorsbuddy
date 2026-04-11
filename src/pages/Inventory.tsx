import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Package, AlertTriangle, Calendar, ArrowDown, ArrowUp, History, Search, Trash2, Link2 } from "lucide-react";
import TreatmentMaterialMappings from "@/components/inventory/TreatmentMaterialMappings";
import { format, differenceInDays } from "date-fns";

const CATEGORIES = ["General", "Consumables", "Instruments", "Medications", "PPE", "Dental Materials", "Lab Supplies"];

export default function Inventory() {
  const { profile } = useAuth();
  const clinicId = profile?.clinic_id;
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ name: "", category: "General", sku: "", quantity: "0", unit: "pcs", min_stock_level: "5", cost_per_unit: "0", supplier_name: "", expiry_date: "", notes: "" });
  const [restockQty, setRestockQty] = useState("1");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase.from("inventory_items").select("*").eq("clinic_id", clinicId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["inventory-transactions", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase.from("inventory_transactions").select("*, inventory_items(name)").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("No clinic");
      const { error } = await supabase.from("inventory_items").insert({
        clinic_id: clinicId,
        name: form.name,
        category: form.category,
        sku: form.sku || null,
        quantity: parseInt(form.quantity) || 0,
        unit: form.unit,
        min_stock_level: parseInt(form.min_stock_level) || 5,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        supplier_name: form.supplier_name || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setAddOpen(false);
      setForm({ name: "", category: "General", sku: "", quantity: "0", unit: "pcs", min_stock_level: "5", cost_per_unit: "0", supplier_name: "", expiry_date: "", notes: "" });
      toast.success("Item added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const restock = useMutation({
    mutationFn: async () => {
      if (!restockItem) throw new Error("No item");
      const qty = parseInt(restockQty);
      if (qty <= 0) throw new Error("Invalid quantity");
      const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: restockItem.quantity + qty }).eq("id", restockItem.id);
      if (updateErr) throw updateErr;
      const { error: txErr } = await supabase.from("inventory_transactions").insert({
        inventory_item_id: restockItem.id,
        transaction_type: "restock" as any,
        quantity_changed: qty,
        notes: `Restocked ${qty} ${restockItem.unit}`,
      });
      if (txErr) throw txErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      setRestockOpen(false);
      setRestockQty("1");
      toast.success("Restocked");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lowStockItems = items.filter((i: any) => i.quantity <= i.min_stock_level);
  const expiringItems = items.filter((i: any) => i.expiry_date && differenceInDays(new Date(i.expiry_date), new Date()) <= 30);
  const totalValue = items.reduce((sum: number, i: any) => sum + (i.quantity * (i.cost_per_unit || 0)), 0);

  const filtered = items.filter((i: any) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = categoryFilter === "all" || i.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <DashboardLayout>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p></CardContent></Card>
        <Card className={lowStockItems.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Low Stock</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{lowStockItems.length}</p></CardContent>
        </Card>
        <Card className={expiringItems.length > 0 ? "border-orange-400" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4" /> Expiring Soon</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{expiringItems.length}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="items"><Package className="h-4 w-4 mr-1" /> Items</TabsTrigger>
            <TabsTrigger value="alerts"><AlertTriangle className="h-4 w-4 mr-1" /> Alerts</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> History</TabsTrigger>
          </TabsList>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
                <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pcs, ml, boxes" /></div>
                <div><Label>Min Stock Level</Label><Input type="number" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })} /></div>
                <div><Label>Cost/Unit (₹)</Label><Input type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} /></div>
                <div><Label>Supplier</Label><Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
                <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <Button onClick={() => addItem.mutate()} disabled={!form.name || addItem.isPending} className="mt-2 w-full">
                {addItem.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Items Tab */}
        <TabsContent value="items">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
                ) : filtered.map((item: any) => {
                  const isLow = item.quantity <= item.min_stock_level;
                  const daysToExpiry = item.expiry_date ? differenceInDays(new Date(item.expiry_date), new Date()) : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}{item.sku && <span className="text-xs text-muted-foreground ml-1">({item.sku})</span>}</TableCell>
                      <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                      <TableCell>
                        <span className={isLow ? "text-destructive font-semibold" : ""}>{item.quantity}</span>
                        {isLow && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>₹{item.cost_per_unit}</TableCell>
                      <TableCell>
                        {item.expiry_date ? (
                          <span className={daysToExpiry !== null && daysToExpiry <= 30 ? "text-orange-500 font-medium" : ""}>
                            {format(new Date(item.expiry_date), "dd MMM yyyy")}
                            {daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0 && <span className="text-xs ml-1">({daysToExpiry}d)</span>}
                            {daysToExpiry !== null && daysToExpiry <= 0 && <Badge variant="destructive" className="ml-1 text-xs">Expired</Badge>}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setRestockItem(item); setRestockOpen(true); }}>
                            <ArrowUp className="h-3 w-3 mr-1" /> Restock
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            {lowStockItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Low Stock Items</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Current: {item.quantity} {item.unit} / Min: {item.min_stock_level}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setRestockItem(item); setRestockOpen(true); }}>Restock</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {expiringItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-orange-500"><Calendar className="h-5 w-5" /> Expiring Soon (30 days)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expiringItems.map((item: any) => {
                      const days = differenceInDays(new Date(item.expiry_date), new Date());
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">Expires: {format(new Date(item.expiry_date), "dd MMM yyyy")} ({days <= 0 ? "EXPIRED" : `${days} days left`})</p>
                          </div>
                          <Badge variant={days <= 0 ? "destructive" : "outline"}>{days <= 0 ? "Expired" : `${days}d`}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {lowStockItems.length === 0 && expiringItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No alerts — all stock levels and expiry dates are healthy.</div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty Changed</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
                ) : transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{format(new Date(tx.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">{tx.inventory_items?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={tx.transaction_type === "restock" ? "default" : tx.transaction_type === "treatment_deduction" ? "secondary" : "outline"}>
                        {tx.transaction_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={tx.quantity_changed > 0 ? "text-green-600" : "text-destructive"}>
                        {tx.quantity_changed > 0 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                        {" "}{Math.abs(tx.quantity_changed)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Restock Dialog */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restock: {restockItem?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current stock: {restockItem?.quantity} {restockItem?.unit}</p>
          <Label>Quantity to add</Label>
          <Input type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} />
          <Button onClick={() => restock.mutate()} disabled={restock.isPending} className="w-full">
            {restock.isPending ? "Restocking..." : "Restock"}
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

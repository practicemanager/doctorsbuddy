import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Search, Users, Smile, CalendarDays, ChevronLeft,
  Phone, Mail, MapPin, FileText, Clock, Activity, User2, HeartPulse, History
} from "lucide-react";
import MedicalHistoryTab from "@/components/patients/MedicalHistoryTab";
import VisitHistoryTab from "@/components/patients/VisitHistoryTab";

const TREATMENT_STATUS_COLORS: Record<string, string> = {
  planned: "bg-primary/10 text-primary border-primary/30",
  in_progress: "bg-warning/10 text-warning border-warning/30",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

function PatientProfile({ patient, clinicId, onBack }: { patient: any; clinicId: string; onBack: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ["patient-appointments", patient.id],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*")
        .eq("patient_id", patient.id).order("scheduled_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["patient-treatments", patient.id],
    queryFn: async () => {
      const { data } = await supabase.from("tooth_treatments")
        .select("*, tooth_records!inner(tooth_number)")
        .eq("tooth_records.patient_id", patient.id)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["patient-invoices", patient.id],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*")
        .eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const updateTreatmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status: status as any };
      if (status === "completed") update.performed_at = new Date().toISOString();
      const { error } = await supabase.from("tooth_treatments").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-treatments"] });
      toast.success("Treatment status updated!");
    },
  });


  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> Back to Patients
      </Button>

      {/* Profile Header */}
      <Card className="shadow-card border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-xl font-bold text-primary-foreground">
                {patient.full_name[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-bold text-foreground">{patient.full_name}</h2>
                  <Badge className="bg-success/10 text-success border-0">Active</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {age && <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {age} years old</span>}
                  {patient.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>}
                  {patient.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {patient.email}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/dental-chart/${patient.id}`)}>
                <Smile className="h-4 w-4 mr-1" /> Dental Chart
              </Button>
              <Button size="sm">
                <CalendarDays className="h-4 w-4 mr-1" /> Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical-history" className="gap-1"><HeartPulse className="h-3 w-3" />Medical History</TabsTrigger>
          <TabsTrigger value="visit-history" className="gap-1"><History className="h-3 w-3" />Visit History</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-card border-0">
              <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span className="font-medium">{patient.date_of_birth || "—"}</span></div>
                {age && <div className="flex justify-between"><span className="text-muted-foreground">Age</span><span className="font-medium">{age} Years</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{patient.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{patient.email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="font-medium text-right max-w-[200px]">{patient.address || "—"}</span></div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Appointments</span><span className="font-medium">{appointments.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Treatments Done</span><span className="font-medium">{treatments.filter((t: any) => t.status === "completed").length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pending Treatments</span><span className="font-medium">{treatments.filter((t: any) => t.status !== "completed" && t.status !== "cancelled").length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Billed</span><span className="font-medium">₹{invoices.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pending Balance</span><span className="font-medium text-destructive">₹{invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled").reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="medical-history" className="mt-4">
          <MedicalHistoryTab patientId={patient.id} clinicId={clinicId} />
        </TabsContent>

        <TabsContent value="visit-history" className="mt-4">
          <VisitHistoryTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="treatments" className="mt-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Tooth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!treatments.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No treatments recorded</TableCell></TableRow>
                  ) : treatments.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.treatment_name}</TableCell>
                      <TableCell>#{t.tooth_records?.tooth_number}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{t.status}</Badge></TableCell>
                      <TableCell>{t.cost ? `₹${Number(t.cost).toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!appointments.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No appointments</TableCell></TableRow>
                  ) : appointments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.scheduled_at).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell className="font-medium">{a.type}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{a.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{a.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!invoices.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No invoices</TableCell></TableRow>
                  ) : invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">₹{Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "overdue" ? "bg-destructive/10 text-destructive" : ""}`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{patient.notes || "No notes recorded for this patient."}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", date_of_birth: "", address: "", notes: "" });

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients", clinicId, search],
    queryFn: async () => {
      if (!clinicId) return [];
      let q = supabase.from("patients").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false });
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: patientStats } = useQuery({
    queryKey: ["patient-stats", clinicId],
    queryFn: async () => {
      if (!clinicId) return { total: 0, newThisMonth: 0, withBalance: 0 };
      const { count: total } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId);
      const firstDay = new Date(); firstDay.setDate(1);
      const { count: newThisMonth } = await supabase.from("patients").select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId).gte("created_at", firstDay.toISOString());
      return { total: total ?? 0, newThisMonth: newThisMonth ?? 0 };
    },
    enabled: !!clinicId,
  });

  const addPatient = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("No clinic");
      const { error } = await supabase.from("patients").insert({
        full_name: form.full_name, clinic_id: clinicId,
        email: form.email || null, phone: form.phone || null,
        date_of_birth: form.date_of_birth || null, address: form.address || null, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient-stats"] });
      setOpen(false);
      setForm({ full_name: "", email: "", phone: "", date_of_birth: "", address: "", notes: "" });
      toast.success("Patient added!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (selectedPatient && clinicId) {
    return (
      <DashboardLayout>
        <PatientProfile patient={selectedPatient} clinicId={clinicId} onBack={() => setSelectedPatient(null)} />
      </DashboardLayout>
    );
  }

  const calcAge = (dob: string | null) => {
    if (!dob) return "—";
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Patient Management</h1>
            <p className="text-muted-foreground">Manage your patient records and information</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Patient</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Patient</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); addPatient.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
                <Button type="submit" className="w-full" disabled={addPatient.isPending}>
                  {addPatient.isPending ? "Adding..." : "Add Patient"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card border-0">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold font-heading">{patientStats?.total ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="text-2xl font-bold font-heading">{patientStats?.newThisMonth ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center"><CalendarDays className="h-5 w-5 text-primary" /></div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Records</p>
                <p className="text-2xl font-bold font-heading">{patients?.length ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center"><Activity className="h-5 w-5 text-primary" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading">All Patients</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search here..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !patients?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No patients yet</TableCell></TableRow>
                ) : patients.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPatient(p)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                          {p.full_name[0].toUpperCase()}
                        </div>
                        <span className="font-medium">{p.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>{calcAge(p.date_of_birth)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); navigate(`/dental-chart/${p.id}`); }}>
                        <Smile className="h-3 w-3 mr-1" /> Chart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

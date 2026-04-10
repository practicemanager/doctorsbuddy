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
import { toast } from "sonner";
import { Plus, CalendarDays } from "lucide-react";

const statusColors: Record<string, string> = {
  scheduled: "bg-info/10 text-info",
  confirmed: "bg-success/10 text-success",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-destructive/10 text-destructive",
};

export default function AppointmentsPage() {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", scheduled_at: "", duration_minutes: "30", type: "General Checkup", notes: "" });

  const { data: patients } = useQuery({
    queryKey: ["patients-list", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("patients").select("id, full_name").eq("clinic_id", clinicId).order("full_name");
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("appointments")
        .select("*, patients(full_name)")
        .eq("clinic_id", clinicId)
        .order("scheduled_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const addAppointment = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("No clinic");
      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        patient_id: form.patient_id,
        scheduled_at: form.scheduled_at,
        duration_minutes: parseInt(form.duration_minutes),
        type: form.type,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setOpen(false);
      setForm({ patient_id: "", scheduled_at: "", duration_minutes: "30", type: "General Checkup", notes: "" });
      toast.success("Appointment booked!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status updated!");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">Schedule and manage appointments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Appointment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); addAppointment.mutate(); }} className="space-y-4">
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
                    <Label>Date & Time *</Label>
                    <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["General Checkup", "Cleaning", "Filling", "Root Canal", "Extraction", "Crown", "Whitening", "Consultation"].map(t =>
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addAppointment.isPending || !form.patient_id}>
                  {addAppointment.isPending ? "Booking..." : "Book Appointment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !appointments?.length ? (
            <Card className="shadow-card border-0"><CardContent className="py-12 text-center text-muted-foreground">No appointments yet</CardContent></Card>
          ) : appointments.map((apt: any) => (
            <Card key={apt.id} className="shadow-card border-0">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <CalendarDays className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{apt.patients?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{apt.type} · {apt.duration_minutes} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{new Date(apt.scheduled_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(apt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <Select value={apt.status} onValueChange={v => updateStatus.mutate({ id: apt.id, status: v })}>
                    <SelectTrigger className="w-32">
                      <Badge className={statusColors[apt.status] || ""} variant="secondary">{apt.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map(s =>
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

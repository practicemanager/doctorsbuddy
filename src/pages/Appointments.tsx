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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, List, RefreshCw } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks, subDays } from "date-fns";

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary border-primary/30",
  confirmed: "bg-success/10 text-success border-success/30",
  in_progress: "bg-warning/10 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  no_show: "bg-destructive/10 text-destructive border-destructive/30",
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8AM-7PM

export default function AppointmentsPage() {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week" | "list">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const rangeStart = viewMode === "week" ? weekStart : currentDate;
  const rangeEnd = viewMode === "week" ? weekEnd : currentDate;

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", clinicId, format(rangeStart, "yyyy-MM-dd"), format(rangeEnd, "yyyy-MM-dd"), viewMode],
    queryFn: async () => {
      if (!clinicId) return [];
      const start = format(rangeStart, "yyyy-MM-dd") + "T00:00:00";
      const end = format(rangeEnd, "yyyy-MM-dd") + "T23:59:59";
      const { data } = await supabase.from("appointments")
        .select("*, patients(full_name)")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const addAppointment = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("No clinic");
      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId, patient_id: form.patient_id,
        scheduled_at: form.scheduled_at,
        duration_minutes: parseInt(form.duration_minutes),
        type: form.type, notes: form.notes || null,
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

  const syncToGoogle = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "sync_all" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => toast.success(`Synced ${data.synced} appointments to Google Calendar`),
    onError: () => toast.error("Google Calendar not connected. Go to Settings → Integrations to connect."),
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

  const navigateDate = (dir: number) => {
    if (viewMode === "week") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1));
  };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Group appointments by hour for day view
  const getAptsForHour = (hour: number, date?: Date) => {
    const targetDate = date || currentDate;
    return appointments.filter((a: any) => {
      const d = new Date(a.scheduled_at);
      return d.getHours() === hour && isSameDay(d, targetDate);
    });
  };

  const AppointmentBlock = ({ apt }: { apt: any }) => (
    <div className={`rounded-md border px-2 py-1.5 text-xs ${statusColors[apt.status] || "bg-muted"} cursor-pointer group relative`}>
      <div className="font-medium truncate">{apt.patients?.full_name}</div>
      <div className="text-[10px] opacity-75">{apt.type} · {apt.duration_minutes}m</div>
      <div className="hidden group-hover:block absolute top-full left-0 z-10 mt-1 bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-medium text-sm text-foreground">{apt.patients?.full_name}</p>
        <p className="text-xs text-muted-foreground">{format(new Date(apt.scheduled_at), "h:mm a")} · {apt.duration_minutes} min</p>
        <p className="text-xs mt-1">{apt.type}</p>
        <div className="mt-2 flex gap-1 flex-wrap">
          {["scheduled", "confirmed", "in_progress", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => updateStatus.mutate({ id: apt.id, status: s })}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${apt.status === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-heading text-2xl font-bold">Appointments</h1>
            <p className="text-muted-foreground text-sm">Schedule and manage appointments</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs h-7 px-3 gap-1"><CalendarDays className="h-3 w-3" />Day</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-7 px-3 gap-1"><CalendarDays className="h-3 w-3" />Week</TabsTrigger>
                <TabsTrigger value="list" className="text-xs h-7 px-3 gap-1"><List className="h-3 w-3" />List</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => syncToGoogle.mutate()} disabled={syncToGoogle.isPending}>
              <RefreshCw className={`mr-1 h-4 w-4 ${syncToGoogle.isPending ? "animate-spin" : ""}`} />
              Sync to Google
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); addAppointment.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Patient *</Label>
                    <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>{patients?.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
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
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="font-heading font-semibold">
            {viewMode === "week"
              ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
              : format(currentDate, "EEEE, MMMM d, yyyy")}
          </h2>
          <Badge variant="secondary">{appointments.length} appointments</Badge>
        </div>

        {/* Day View */}
        {viewMode === "day" && (
          <Card className="shadow-card border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="max-h-[65vh] overflow-y-auto">
                {HOURS.map(hour => {
                  const apts = getAptsForHour(hour);
                  return (
                    <div key={hour} className="flex border-b min-h-[60px]">
                      <div className="w-16 shrink-0 px-2 py-2 text-xs text-muted-foreground font-medium border-r bg-muted/30 flex items-start justify-end">
                        {format(new Date().setHours(hour, 0), "h a")}
                      </div>
                      <div className="flex-1 p-1.5 space-y-1">
                        {apts.map((apt: any) => <AppointmentBlock key={apt.id} apt={apt} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <Card className="shadow-card border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Day headers */}
              <div className="flex border-b bg-muted/30">
                <div className="w-14 shrink-0 border-r" />
                {weekDays.map(day => (
                  <div key={day.toISOString()} className={`flex-1 text-center py-2 border-r last:border-r-0 ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}>
                    <div className="text-[10px] text-muted-foreground uppercase">{format(day, "EEE")}</div>
                    <div className={`text-sm font-semibold ${isSameDay(day, new Date()) ? "text-primary" : ""}`}>{format(day, "d")}</div>
                  </div>
                ))}
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {HOURS.map(hour => (
                  <div key={hour} className="flex border-b">
                    <div className="w-14 shrink-0 px-1 py-1 text-[10px] text-muted-foreground font-medium border-r bg-muted/20 flex items-start justify-end">
                      {format(new Date().setHours(hour, 0), "h a")}
                    </div>
                    {weekDays.map(day => {
                      const apts = getAptsForHour(hour, day);
                      return (
                        <div key={day.toISOString()} className={`flex-1 min-h-[48px] p-0.5 border-r last:border-r-0 ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}>
                          {apts.map((apt: any) => <AppointmentBlock key={apt.id} apt={apt} />)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="grid gap-3">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !appointments.length ? (
              <Card className="shadow-card border-0"><CardContent className="py-12 text-center text-muted-foreground">No appointments for this period</CardContent></Card>
            ) : appointments.map((apt: any) => (
              <Card key={apt.id} className="shadow-card border-0">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{apt.patients?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{apt.type} · {apt.duration_minutes} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{format(new Date(apt.scheduled_at), "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(apt.scheduled_at), "h:mm a")}</p>
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
        )}
      </div>
    </DashboardLayout>
  );
}

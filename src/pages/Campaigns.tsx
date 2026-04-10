import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Megaphone, Send } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-info/10 text-info",
  sending: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function CampaignsPage() {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "email" as const, subject: "", content: "" });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("campaigns")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const addCampaign = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("No clinic");
      const { error } = await supabase.from("campaigns").insert({
        clinic_id: clinicId,
        name: form.name,
        type: form.type,
        subject: form.subject || null,
        content: form.content || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
      setForm({ name: "", type: "email", subject: "", content: "" });
      toast.success("Campaign created!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "sent") update.sent_at = new Date().toISOString();
      const { error } = await supabase.from("campaigns").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign updated!");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground">Marketing automation & outreach</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); addCampaign.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Spring Cleaning Special" />
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Don't miss our special offer!" />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Write your campaign message..." />
                </div>
                <Button type="submit" className="w-full" disabled={addCampaign.isPending}>
                  {addCampaign.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !campaigns?.length ? (
            <Card className="shadow-card border-0"><CardContent className="py-12 text-center text-muted-foreground">No campaigns yet. Create one to get started!</CardContent></Card>
          ) : campaigns.map(c => (
            <Card key={c.id} className="shadow-card border-0">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <Megaphone className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.type} · {c.subject || "No subject"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[c.status] || ""} variant="secondary">{c.status}</Badge>
                  {c.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: "sent" })}>
                      <Send className="mr-1 h-3 w-3" /> Send
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

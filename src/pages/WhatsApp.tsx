import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

export default function WhatsAppPage() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");

  const { data: patients } = useQuery({
    queryKey: ["patients-list", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase.from("patients").select("id, full_name, phone").eq("clinic_id", clinicId).order("full_name");
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  const selectedPatient = patients?.find(p => p.id === patientId);

  const sendMessage = async () => {
    const targetPhone = phone || selectedPatient?.phone;
    if (!targetPhone) {
      toast.error("Please enter a phone number");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { phone: targetPhone, message },
      });
      if (error) throw error;
      toast.success("Message sent via WhatsApp!");
      setMessage("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send message. Make sure WhatsApp is configured.");
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold">WhatsApp Messaging</h1>
          <p className="text-muted-foreground">Send messages to patients via WhatsApp</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <MessageSquare className="h-5 w-5 text-success" /> Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Patient (optional)</Label>
                <Select value={patientId} onValueChange={v => { setPatientId(v); const p = patients?.find(x => x.id === v); if (p?.phone) setPhone(p.phone); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a patient..." /></SelectTrigger>
                  <SelectContent>
                    {patients?.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name} {p.phone ? `(${p.phone})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                  placeholder="Hi! This is a reminder about your upcoming dental appointment..." />
              </div>
              <Button onClick={sendMessage} className="w-full" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send WhatsApp Message"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="font-heading">Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>To enable WhatsApp messaging, you need:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>A Meta Business account with WhatsApp Business API access</li>
                <li>A WhatsApp Business phone number</li>
                <li>Configure the <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">WHATSAPP_TOKEN</code> and <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">PHONE_NUMBER_ID</code> secrets</li>
              </ol>
              <p className="mt-4 text-xs">Messages will be sent through the WhatsApp Business API. Standard messaging rates apply.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

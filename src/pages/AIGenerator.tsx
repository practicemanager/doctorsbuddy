import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Copy, Wand2 } from "lucide-react";

export default function AIGeneratorPage() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [campaignType, setCampaignType] = useState("recall");
  const [tone, setTone] = useState("friendly");
  const [result, setResult] = useState("");

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you want to generate");
      return;
    }
    setLoading(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: { prompt, campaignType, tone },
      });

      if (error) throw error;
      setResult(data?.content || "No content generated");
      toast.success("Campaign content generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate content");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold">AI Campaign Generator</h1>
          <p className="text-muted-foreground">Let AI create compelling campaign content for your practice</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <Wand2 className="h-5 w-5 text-primary" /> Configure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recall">Patient Recall</SelectItem>
                    <SelectItem value="promotion">Promotion / Offer</SelectItem>
                    <SelectItem value="education">Educational Content</SelectItem>
                    <SelectItem value="welcome">Welcome Message</SelectItem>
                    <SelectItem value="followup">Post-Visit Follow-up</SelectItem>
                    <SelectItem value="seasonal">Seasonal Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly & Warm</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual & Fun</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Describe your campaign</Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="e.g., Remind patients who haven't visited in 6 months about their cleaning appointment with a 15% discount..."
                />
              </div>
              <Button onClick={generate} className="w-full" disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? "Generating..." : "Generate Content"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-heading">
                  <Sparkles className="h-5 w-5 text-primary" /> Result
                </CardTitle>
                {result && (
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  <p>Your AI-generated content will appear here</p>
                </div>
              ) : (
                <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm text-foreground">
                  {result}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

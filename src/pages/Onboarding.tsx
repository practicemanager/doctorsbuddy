import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({ name: clinicName, phone: clinicPhone, address: clinicAddress })
      .select()
      .single();

    if (clinicError || !clinic) {
      toast.error("Failed to create clinic");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ clinic_id: clinic.id, role: "owner" })
      .eq("user_id", user.id);

    if (profileError) {
      toast.error("Failed to link clinic to profile");
    } else {
      await refreshProfile();
      toast.success("Clinic created! Welcome to Dental Buddy.");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-primary">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Set Up Your Clinic</h1>
          <p className="mt-1 text-muted-foreground">Tell us about your practice</p>
        </div>
        <Card className="shadow-elevated border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input value={clinicName} onChange={e => setClinicName(e.target.value)}
                  required placeholder="Happy Smiles Dental" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={clinicAddress} onChange={e => setClinicAddress(e.target.value)}
                  placeholder="123 Main St, City" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Clinic & Get Started"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

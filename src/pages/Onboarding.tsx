import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Building2, Clock, Receipt, Users, UserPlus,
  ChevronRight, ChevronLeft, Upload, Check, SkipForward,
} from "lucide-react";

const STEPS = [
  { icon: Building2, label: "Clinic Details" },
  { icon: Clock, label: "Working Hours" },
  { icon: Receipt, label: "Billing & GST" },
  { icon: Users, label: "Invite Staff" },
  { icon: UserPlus, label: "First Patient" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Clinic details
  const [clinicName, setClinicName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step 2: Working hours (stored locally, can extend to DB later)
  const [workingHours, setWorkingHours] = useState(
    DAYS.map(d => ({ day: d, open: d !== "Sunday", from: "09:00", to: "18:00" }))
  );

  // Step 3: Billing/GST
  const [gstNumber, setGstNumber] = useState("");
  const [defaultTaxRate, setDefaultTaxRate] = useState("18");
  const [currency, setCurrency] = useState("INR");

  // Step 4: Invite staff
  const [staffEmails, setStaffEmails] = useState<string[]>([""]);

  // Step 5: First patient
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientDob, setPatientDob] = useState("");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const toggleDay = (idx: number) => {
    setWorkingHours(prev =>
      prev.map((h, i) => i === idx ? { ...h, open: !h.open } : h)
    );
  };

  const updateHours = (idx: number, field: "from" | "to", value: string) => {
    setWorkingHours(prev =>
      prev.map((h, i) => i === idx ? { ...h, [field]: value } : h)
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: insertProfileError } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, full_name: user.user_metadata?.full_name || "" });
        if (insertProfileError) {
          toast.error("Failed to create profile: " + insertProfileError.message);
          setLoading(false);
          return;
        }
      }

      // Create clinic
      const { data: clinicId, error: clinicError } = await supabase
        .rpc("create_clinic_and_link", {
          p_name: clinicName,
          p_phone: clinicPhone || null,
          p_address: clinicAddress || null,
        });

      if (clinicError) {
        toast.error("Failed to create clinic: " + clinicError.message);
        setLoading(false);
        return;
      }

      // Upload logo if provided
      if (logoFile && clinicId) {
        const ext = logoFile.name.split(".").pop();
        const path = `${clinicId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("clinic-logos")
          .upload(path, logoFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from("clinic-logos")
            .getPublicUrl(path);
          await supabase
            .from("clinics")
            .update({ logo_url: publicUrl.publicUrl, email: clinicEmail || null })
            .eq("id", clinicId);
        }
      } else if (clinicEmail && clinicId) {
        await supabase
          .from("clinics")
          .update({ email: clinicEmail })
          .eq("id", clinicId);
      }

      // Create first patient if provided (Step 5)
      if (patientName.trim() && clinicId) {
        await supabase.from("patients").insert({
          clinic_id: clinicId,
          full_name: patientName.trim(),
          phone: patientPhone || null,
          date_of_birth: patientDob || null,
        });
      }

      await refreshProfile();
      toast.success("Clinic created! Welcome to Doctors Buddy.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Something went wrong: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return clinicName.trim().length > 0;
    return true; // other steps are optional
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Set Up Your Clinic</h1>
          <p className="mt-1 text-muted-foreground text-sm">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
        </div>

        {/* Progress */}
        <Progress value={progress} className="mb-6 h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                i < step ? "bg-primary border-primary text-primary-foreground" :
                i === step ? "border-primary text-primary bg-background" :
                "border-border text-muted-foreground bg-background"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="pt-6">
            {/* Step 1: Clinic Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted hover:border-primary transition-colors overflow-hidden"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">
                    Upload clinic logo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
                <div className="space-y-2">
                  <Label>Clinic Name *</Label>
                  <Input value={clinicName} onChange={e => setClinicName(e.target.value)} required placeholder="Happy Smiles Dental" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} placeholder="clinic@email.com" type="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} placeholder="123 Main St, City" />
                </div>
              </div>
            )}

            {/* Step 2: Working Hours */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">Set your clinic's working hours</p>
                {workingHours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-28 cursor-pointer">
                      <input type="checkbox" checked={h.open} onChange={() => toggleDay(i)}
                        className="rounded border-border text-primary focus:ring-primary" />
                      <span className={`text-sm ${h.open ? "text-foreground" : "text-muted-foreground line-through"}`}>{h.day}</span>
                    </label>
                    {h.open && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input type="time" value={h.from} onChange={e => updateHours(i, "from", e.target.value)} className="h-8 text-xs" />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input type="time" value={h.to} onChange={e => updateHours(i, "to", e.target.value)} className="h-8 text-xs" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Billing & GST */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">Configure billing defaults (you can change these later in Settings)</p>
                <div className="space-y-2">
                  <Label>GST / Tax ID Number</Label>
                  <Input value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Default Tax Rate (%)</Label>
                    <Input type="number" value={defaultTaxRate} onChange={e => setDefaultTaxRate(e.target.value)} placeholder="18" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="INR" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Invite Staff */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">Invite your team members (optional — you can do this later)</p>
                {staffEmails.map((email, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={email}
                      onChange={e => {
                        const arr = [...staffEmails];
                        arr[i] = e.target.value;
                        setStaffEmails(arr);
                      }}
                      placeholder="staff@clinic.com"
                      type="email"
                    />
                    {i === staffEmails.length - 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setStaffEmails([...staffEmails, ""])}>
                        +
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Staff invitations will be sent after setup is complete.</p>
              </div>
            )}

            {/* Step 5: First Patient */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">Add your first patient to get started (optional)</p>
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input value={patientDob} onChange={e => setPatientDob(e.target.value)} type="date" />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={prev} disabled={step === 0} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                {step > 0 && step < STEPS.length - 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={next} className="gap-1 text-muted-foreground">
                    <SkipForward className="h-3.5 w-3.5" /> Skip
                  </Button>
                )}
                <Button type="button" onClick={next} disabled={!canProceed() || loading} className="gap-1">
                  {step === STEPS.length - 1
                    ? loading ? "Creating..." : "Finish Setup"
                    : <>Next <ChevronRight className="h-4 w-4" /></>
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Stethoscope, CheckCircle2, UserPlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function PatientSelfRegister() {
  const [searchParams] = useSearchParams();
  const clinicId = searchParams.get("clinic");
  const [loading, setLoading] = useState(false);
  const [tokenNumber, setTokenNumber] = useState<number | null>(null);
  const [registered, setRegistered] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) {
      toast.error("Invalid registration link. Please scan the QR code again.");
      return;
    }
    setLoading(true);

    // Create patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinicId,
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        date_of_birth: dob || null,
      })
      .select("id")
      .single();

    if (patientError) {
      toast.error("Registration failed: " + patientError.message);
      setLoading(false);
      return;
    }

    // Get next token number and create queue entry
    const today = new Date().toISOString().split("T")[0];
    const { data: nextToken, error: tokenError } = await supabase
      .rpc("get_next_token_number", { p_clinic_id: clinicId, p_date: today });

    if (tokenError) {
      toast.error("Failed to generate token: " + tokenError.message);
      setLoading(false);
      return;
    }

    const { error: queueError } = await supabase
      .from("queue_tokens")
      .insert({
        clinic_id: clinicId,
        patient_id: patient.id,
        token_number: nextToken,
        queue_date: today,
        status: "waiting",
        priority: "normal",
      });

    if (queueError) {
      toast.error("Failed to add to queue: " + queueError.message);
      setLoading(false);
      return;
    }

    setTokenNumber(nextToken);
    setRegistered(true);
    setLoading(false);
  };

  // Show QR code generator for clinic staff (no clinic param)
  if (!clinicId) {
    return <QRCodeGenerator />;
  }

  if (registered && tokenNumber !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 p-4">
        <Card className="w-full max-w-sm text-center shadow-lg border-0">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Registration Successful!</h2>
            <div className="bg-blue-50 rounded-2xl p-6">
              <p className="text-sm text-muted-foreground mb-1">Your Token Number</p>
              <p className="text-6xl font-bold text-blue-600">{tokenNumber}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please wait for your number to be called. Thank you, <strong>{fullName}</strong>!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-400">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Patient Registration</h1>
          <p className="text-sm text-muted-foreground mt-1">Fill in your details to get a queue token</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)}
                  required placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210" type="tel" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="patient@email.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input value={dob} onChange={e => setDob(e.target.value)} type="date" />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Registering..." : "Register & Get Token"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QRCodeGenerator() {
  const [clinicId, setClinicId] = useState("");
  const registrationUrl = clinicId
    ? `${window.location.origin}/register?clinic=${clinicId}`
    : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Generate Patient Registration QR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Clinic ID</Label>
            <Input value={clinicId} onChange={e => setClinicId(e.target.value)}
              placeholder="Enter your clinic ID" />
          </div>
          {registrationUrl && (
            <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-xl border">
              <QRCodeSVG value={registrationUrl} size={200} />
              <p className="text-xs text-muted-foreground text-center break-all">{registrationUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

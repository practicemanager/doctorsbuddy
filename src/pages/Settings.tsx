import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Globe, MapPin, Phone, Mail, Link2, Facebook, Instagram, Twitter,
  Users, Plus, Trash2, Save, Package, Settings as SettingsIcon, QrCode
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// ─── Clinic Info Tab ────────────────────────────────────────────────
function ClinicInfoTab({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "", address: "", phone: "", email: "", website: "",
    logo_url: "", google_maps_url: "", facebook_url: "", instagram_url: "",
    twitter_url: "", tiktok_url: "",
  });

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["clinic", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("*").eq("id", clinicId).single();
      return data;
    },
  });

  useEffect(() => {
    if (clinic) {
      setForm({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
        email: clinic.email || "",
        website: clinic.website || "",
        logo_url: clinic.logo_url || "",
        google_maps_url: clinic.google_maps_url || "",
        facebook_url: clinic.facebook_url || "",
        instagram_url: clinic.instagram_url || "",
        twitter_url: clinic.twitter_url || "",
        tiktok_url: clinic.tiktok_url || "",
      });
    }
  }, [clinic]);

  const updateClinic = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinics").update(form).eq("id", clinicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic"] });
      toast.success("Clinic info updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <form onSubmit={e => { e.preventDefault(); updateClinic.mutate(); }} className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Building2 className="h-5 w-5 text-primary" /> Basic Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Clinic Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="hello@clinic.com" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yourpractice.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, State" />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Link2 className="h-5 w-5 text-primary" /> Social & GMB Links
          </CardTitle>
          <CardDescription>Connect your online presence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Google Business Profile URL</Label>
            <Input value={form.google_maps_url} onChange={e => setForm(f => ({ ...f, google_maps_url: e.target.value }))} placeholder="https://g.page/your-clinic" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Facebook</Label>
              <Input value={form.facebook_url} onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value }))} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
              <Input value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" /> Twitter / X</Label>
              <Input value={form.twitter_url} onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="https://x.com/..." />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input value={form.tiktok_url} onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))} placeholder="https://tiktok.com/@..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={updateClinic.isPending}>
        <Save className="mr-2 h-4 w-4" />
        {updateClinic.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

// ─── Team Tab ───────────────────────────────────────────────────────
function TeamTab({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["team", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("clinic_id", clinicId).order("full_name");
      return data ?? [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("profiles").update({ role: role as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Role updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Users className="h-5 w-5 text-primary" /> Team Members
        </CardTitle>
        <CardDescription>Manage your clinic staff and their roles</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !members?.length ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No team members</TableCell></TableRow>
            ) : members.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.full_name || "Unnamed"}</TableCell>
                <TableCell>
                  <Select value={m.role} onValueChange={v => updateRole.mutate({ id: m.id, role: v })}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["owner", "dentist", "hygienist", "receptionist", "assistant"].map(r =>
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(m.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Vendors Tab ────────────────────────────────────────────────────
function VendorsTab({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", contact_name: "", email: "", phone: "", notes: "" });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("clinic_id", clinicId).order("name");
      return data ?? [];
    },
  });

  const addVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vendors").insert({ ...form, clinic_id: clinicId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setOpen(false);
      setForm({ name: "", category: "", contact_name: "", email: "", phone: "", notes: "" });
      toast.success("Vendor added!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor removed!");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold">Vendors & Suppliers</h3>
          <p className="text-sm text-muted-foreground">Manage your dental supply vendors</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Vendor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); addVendor.mutate(); }} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Vendor Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Acme Dental Supplies" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {["Dental Supplies", "Lab Services", "Equipment", "Software", "Insurance", "Marketing", "Cleaning", "Other"].map(c =>
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={addVendor.isPending}>
                {addVendor.isPending ? "Adding..." : "Add Vendor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !vendors?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vendors yet</TableCell></TableRow>
              ) : vendors.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.category ? <Badge variant="secondary">{v.category}</Badge> : "—"}</TableCell>
                  <TableCell>{v.contact_name || "—"}</TableCell>
                  <TableCell>{v.phone || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteVendor.mutate(v.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────
export default function SettingsPage() {
  const { clinicId } = useAuth();

  if (!clinicId) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">No clinic found. Please complete onboarding first.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your clinic, team, and vendors</p>
        </div>

        <Tabs defaultValue="clinic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="clinic">Clinic Info</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="qr">Patient QR</TabsTrigger>
          </TabsList>

          <TabsContent value="clinic">
            <ClinicInfoTab clinicId={clinicId} />
          </TabsContent>

          <TabsContent value="team">
            <TeamTab clinicId={clinicId} />
          </TabsContent>

          <TabsContent value="vendors">
            <VendorsTab clinicId={clinicId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Users, Receipt, BarChart3, Smile, Shield,
  Zap, Clock, Star, ArrowRight, CheckCircle2
} from "lucide-react";

const features = [
  { icon: Users, title: "Patient Management", desc: "Complete patient records, medical history, and treatment tracking in one place." },
  { icon: CalendarDays, title: "Smart Scheduling", desc: "Drag-and-drop appointments with automated reminders and queue management." },
  { icon: Receipt, title: "Billing & Invoicing", desc: "Generate invoices, track payments, and manage GST-ready financial reports." },
  { icon: Smile, title: "Dental Charting", desc: "Interactive odontogram with unified condition, treatment, and prescription flow." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Revenue trends, expense tracking, and monthly performance insights." },
  { icon: Shield, title: "Secure & Compliant", desc: "Role-based access, encrypted data, and clinic-level isolation for privacy." },
];

const stats = [
  { value: "2,000+", label: "Dentists Trust Us" },
  { value: "50K+", label: "Patients Managed" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9★", label: "User Rating" },
];

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (session && profile?.clinic_id) return <Navigate to="/dashboard" replace />;
  if (session && !profile?.clinic_id) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Smile className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">Dental Buddy</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/50 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm mb-6">
            <Star className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground">Trusted By 2,000+ Dentists</span>
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold text-foreground leading-tight max-w-3xl mx-auto">
            Run Your Dental Practice{" "}
            <span className="text-primary">Smarter</span>, Not Harder
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            All-in-one platform to manage appointments, patients, billing, and insights built for modern dental clinics.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">Contact Sales</Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl font-bold text-foreground">Everything You Need</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            A comprehensive suite of tools designed specifically for dental professionals.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="group rounded-xl border bg-card p-6 hover:shadow-elevated transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="font-heading text-3xl font-bold text-primary-foreground">
            Ready to Transform Your Practice?
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Join thousands of dental professionals who trust Dental Buddy to run their practice efficiently.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {["No credit card required", "14-day free trial", "Cancel anytime"].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/90">
                <CheckCircle2 className="h-4 w-4" /> {t}
              </span>
            ))}
          </div>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="mt-8">Get Started Free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
              <Smile className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-sm font-semibold text-foreground">Dental Buddy</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Dental Buddy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus, Play, CalendarDays, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import KPICards from "@/components/dashboard/KPICards";
import UpNextWidget from "@/components/dashboard/UpNextWidget";
import LiveQueueWidget from "@/components/dashboard/LiveQueueWidget";
import TodayAppointments from "@/components/dashboard/TodayAppointments";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import PendingTreatments from "@/components/dashboard/PendingTreatments";

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {greeting}, {profile?.full_name?.split(" ")[0] || "Doctor"} 👋
            </h1>
            <p className="text-muted-foreground text-sm">Here's what's happening at your clinic today.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => navigate("/patients")} className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Walk-in
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/queue")} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Queue
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/appointments")} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Appointment
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/billing")} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Invoice
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Main Grid: Up Next + Queue + Appointments */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <UpNextWidget />
            <FinancialSummary />
          </div>
          <LiveQueueWidget />
          <TodayAppointments />
        </div>

        {/* Pending Treatments */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PendingTreatments />
        </div>
      </div>
    </DashboardLayout>
  );
}

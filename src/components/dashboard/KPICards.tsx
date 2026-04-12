import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, IndianRupee, AlertTriangle, TrendingDown, Package, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function MiniSparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="mt-1">
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KPICards() {
  const { clinicId } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data: todayApptCount = 0 } = useQuery({
    queryKey: ["kpi-today-appts", clinicId],
    queryFn: async () => {
      const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId!).gte("scheduled_at", today + "T00:00:00").lt("scheduled_at", today + "T23:59:59");
      return count ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: todayRevenue = 0 } = useQuery({
    queryKey: ["kpi-today-revenue", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("amount")
        .eq("clinic_id", clinicId!).eq("status", "paid").gte("paid_at", today + "T00:00:00");
      return data?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: pendingCollections = 0 } = useQuery({
    queryKey: ["kpi-pending-collections", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("amount")
        .eq("clinic_id", clinicId!).in("status", ["sent", "draft", "overdue"]);
      return data?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: noShowRate = 0 } = useQuery({
    queryKey: ["kpi-noshow-rate", clinicId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase.from("appointments").select("status")
        .eq("clinic_id", clinicId!).gte("scheduled_at", thirtyDaysAgo.toISOString());
      if (!data?.length) return 0;
      const noShows = data.filter(a => a.status === "no_show").length;
      return Math.round((noShows / data.length) * 100);
    },
    enabled: !!clinicId,
  });

  const { data: lowStockCount = 0 } = useQuery({
    queryKey: ["kpi-low-stock", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_items").select("quantity, min_stock_level")
        .eq("clinic_id", clinicId!);
      return data?.filter(i => i.quantity <= i.min_stock_level).length ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: monthlyRevenueTrend = [] } = useQuery({
    queryKey: ["kpi-monthly-trend", clinicId],
    queryFn: async () => {
      const trend: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const { data } = await supabase.from("invoices").select("amount")
          .eq("clinic_id", clinicId!).eq("status", "paid")
          .gte("paid_at", start.toISOString()).lte("paid_at", end.toISOString());
        trend.push(data?.reduce((s, i) => s + Number(i.amount), 0) ?? 0);
      }
      return trend;
    },
    enabled: !!clinicId,
  });

  const cards = [
    { title: "Today's Appointments", value: todayApptCount, icon: CalendarDays, color: "bg-accent text-primary" },
    { title: "Today's Revenue", value: `₹${todayRevenue.toLocaleString()}`, icon: IndianRupee, color: "bg-success/10 text-success" },
    { title: "Pending Collections", value: `₹${pendingCollections.toLocaleString()}`, icon: AlertTriangle, color: "bg-warning/10 text-warning" },
    { title: "No-show Rate (30d)", value: `${noShowRate}%`, icon: TrendingDown, color: "bg-destructive/10 text-destructive" },
    { title: "Low Stock Items", value: lowStockCount, icon: Package, color: lowStockCount > 0 ? "bg-destructive/10 text-destructive" : "bg-accent text-primary" },
    { title: "Revenue Trend (6m)", value: `₹${(monthlyRevenueTrend[monthlyRevenueTrend.length - 1] ?? 0).toLocaleString()}`, icon: TrendingUp, color: "bg-success/10 text-success", sparkline: monthlyRevenueTrend },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold font-heading text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.title}</p>
            </div>
            {"sparkline" in card && card.sparkline && <MiniSparkline data={card.sparkline} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function FinancialSummary() {
  const { clinicId } = useAuth();

  const firstDay = new Date();
  firstDay.setDate(1);

  const { data: monthRevenue = 0 } = useQuery({
    queryKey: ["dash-month-revenue", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("amount")
        .eq("clinic_id", clinicId!).eq("status", "paid").gte("paid_at", firstDay.toISOString());
      return data?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;
    },
    enabled: !!clinicId,
  });

  const { data: monthExpenses = 0 } = useQuery({
    queryKey: ["dash-month-expenses", clinicId],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("amount")
        .eq("clinic_id", clinicId!).gte("expense_date", firstDay.toISOString().split("T")[0]);
      return data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
    },
    enabled: !!clinicId,
  });

  const profit = monthRevenue - monthExpenses;

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <TrendingUp className="h-4 w-4 text-success" />
          This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Revenue</span>
          <span className="text-sm font-semibold text-foreground">₹{monthRevenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Expenses</span>
          <span className="text-sm font-semibold text-destructive">₹{monthExpenses.toLocaleString()}</span>
        </div>
        <div className="border-t pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Net Profit</span>
          <span className={`text-lg font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
            ₹{profit.toLocaleString()}
          </span>
        </div>
        {monthRevenue > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Margin</span>
            <span className="text-xs font-medium text-foreground">
              {((profit / monthRevenue) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar, Sheet, FileText, Link2, Unlink, RefreshCw, ExternalLink,
  CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GoogleIntegrationTab() {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["google-integration-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "get_auth_url" },
      });
      if (error) throw error;
      window.location.href = data.url;
    },
    onError: (err: any) => toast.error("Failed to start Google connection: " + err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("google-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Google account disconnected");
      queryClient.invalidateQueries({ queryKey: ["google-integration-status"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "sync_all" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} appointments to Google Calendar`);
      queryClient.invalidateQueries({ queryKey: ["google-integration-status"] });
    },
    onError: (err: any) => toast.error("Sync failed: " + err.message),
  });

  const exportToSheets = async (exportType: string) => {
    setExporting(exportType);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-export", {
        body: { export_type: exportType },
      });
      if (error) throw error;
      toast.success(`Exported ${data.rows} rows to Google Sheets`);
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExporting(null);
    }
  };

  // Handle OAuth callback code
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get("code");

  const exchangeMutation = useMutation({
    mutationFn: async (code: string) => {
      const redirectUri = window.location.origin + "/settings?tab=integrations";
      const { data, error } = await supabase.functions.invoke("google-auth", {
        body: { action: "exchange_code", code, redirect_uri: redirectUri },
      });
      if (error) throw error;
      // Clean up URL
      window.history.replaceState({}, "", "/settings?tab=integrations");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Connected Google account: ${data.email}`);
      queryClient.invalidateQueries({ queryKey: ["google-integration-status"] });
    },
    onError: (err: any) => toast.error("Failed to connect: " + err.message),
  });

  // Auto-exchange code on page load
  if (authCode && !exchangeMutation.isPending && !exchangeMutation.isSuccess) {
    exchangeMutation.mutate(authCode);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status?.connected;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg">Google Workspace</CardTitle>
                <CardDescription>
                  {isConnected
                    ? `Connected as ${status.connected_email}`
                    : "Connect your Google account for Calendar, Sheets & Drive"}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}>
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
              {status.last_sync_at && (
                <span className="text-xs text-muted-foreground">
                  Last sync: {new Date(status.last_sync_at).toLocaleString()}
                </span>
              )}
            </div>
          ) : (
            <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
              <Link2 className="w-4 h-4 mr-2" />
              {connectMutation.isPending ? "Connecting..." : "Connect Google Account"}
            </Button>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <>
          {/* Calendar Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Google Calendar Sync
              </CardTitle>
              <CardDescription>
                Two-way sync: Push appointments to Google Calendar and pull changes back
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  {syncMutation.isPending ? "Syncing..." : "Sync All Appointments"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Google Calendar
                  </a>
                </Button>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>New appointments are automatically pushed to Google Calendar</li>
                  <li>Cancelled appointments are updated in Google Calendar</li>
                  <li>You can also manually sync all pending appointments</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Google Sheets Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sheet className="w-5 h-5 text-green-600" />
                Export to Google Sheets
              </CardTitle>
              <CardDescription>
                Export clinic data directly to a new Google Spreadsheet in your Drive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "patients", label: "Patient List", icon: "👥" },
                  { key: "appointments", label: "Appointments", icon: "📅" },
                  { key: "invoices", label: "Invoices", icon: "💰" },
                  { key: "expenses", label: "Expenses", icon: "📊" },
                ].map(item => (
                  <Button
                    key={item.key}
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => exportToSheets(item.key)}
                    disabled={exporting !== null}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                    {exporting === item.key && <Loader2 className="w-3 h-3 animate-spin" />}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Google Drive Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-600" />
                Google Drive & Docs
              </CardTitle>
              <CardDescription>
                Exported spreadsheets are saved to your Google Drive automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Google Drive
                </a>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

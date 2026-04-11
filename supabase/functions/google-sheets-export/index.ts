import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(adminClient: any, clinicId: string) {
  const { data: integration } = await adminClient.from("google_integrations")
    .select("*").eq("clinic_id", clinicId).single();
  if (!integration) throw new Error("Google not connected");

  const expiresAt = new Date(integration.token_expires_at);
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return integration.access_token;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await res.json();
  if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error}`);

  await adminClient.from("google_integrations").update({
    access_token: tokens.access_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq("id", integration.id);

  return tokens.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const tokenStr = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(tokenStr);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase.from("profiles").select("clinic_id").single();
    if (!profile?.clinic_id) {
      return new Response(JSON.stringify({ error: "No clinic" }), { status: 400, headers: corsHeaders });
    }

    const accessToken = await getAccessToken(adminClient, profile.clinic_id);
    const { export_type } = await req.json();

    let title = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (export_type === "patients") {
      title = "Patient List Export";
      headers = ["Name", "Phone", "Email", "Date of Birth", "Address", "Created At"];
      const { data: patients } = await supabase.from("patients")
        .select("*").eq("clinic_id", profile.clinic_id).order("full_name");
      rows = (patients || []).map(p => [
        p.full_name, p.phone || "", p.email || "", p.date_of_birth || "", p.address || "",
        new Date(p.created_at).toLocaleDateString(),
      ]);
    } else if (export_type === "appointments") {
      title = "Appointments Export";
      headers = ["Date", "Patient", "Type", "Status", "Duration (min)", "Notes"];
      const { data: appts } = await supabase.from("appointments")
        .select("*, patients(full_name)").eq("clinic_id", profile.clinic_id).order("scheduled_at", { ascending: false });
      rows = (appts || []).map(a => [
        new Date(a.scheduled_at).toLocaleString(), a.patients?.full_name || "", a.type,
        a.status, String(a.duration_minutes), a.notes || "",
      ]);
    } else if (export_type === "invoices") {
      title = "Invoice Report";
      headers = ["Date", "Patient", "Amount (₹)", "Status", "Due Date", "Paid At"];
      const { data: invoices } = await supabase.from("invoices")
        .select("*, patients(full_name)").eq("clinic_id", profile.clinic_id).order("created_at", { ascending: false });
      rows = (invoices || []).map(i => [
        new Date(i.created_at).toLocaleDateString(), i.patients?.full_name || "",
        String(i.amount), i.status, i.due_date || "", i.paid_at ? new Date(i.paid_at).toLocaleDateString() : "",
      ]);
    } else if (export_type === "expenses") {
      title = "Expense Report";
      headers = ["Date", "Description", "Category", "Amount (₹)", "GST (₹)", "Vendor", "Payment Method"];
      const { data: expenses } = await supabase.from("expenses")
        .select("*").eq("clinic_id", profile.clinic_id).order("expense_date", { ascending: false });
      rows = (expenses || []).map(e => [
        e.expense_date, e.description, e.category, String(e.amount),
        String(e.gst_amount || 0), e.vendor_name || "", e.payment_method || "",
      ]);
    } else {
      return new Response(JSON.stringify({ error: "Invalid export_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { title: `${title} - ${new Date().toLocaleDateString()}` },
        sheets: [{ properties: { title: "Data" } }],
      }),
    });

    const spreadsheet = await createRes.json();
    if (!createRes.ok) {
      return new Response(JSON.stringify({ error: spreadsheet.error?.message || "Failed to create sheet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spreadsheetId = spreadsheet.spreadsheetId;

    // Write data
    const values = [headers, ...rows];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Data!A1:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      }
    );

    // Format header row (bold)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 } } },
              fields: "userEnteredFormat(textFormat,backgroundColor)",
            },
          }, {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: headers.length },
            },
          }],
        }),
      }
    );

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return new Response(JSON.stringify({ success: true, url: sheetUrl, rows: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

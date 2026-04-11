import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshTokenIfNeeded(adminClient: any, integration: any) {
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

  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await adminClient.from("google_integrations").update({
    access_token: tokens.access_token,
    token_expires_at: newExpiry,
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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
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

    const { data: integration } = await adminClient.from("google_integrations")
      .select("*").eq("clinic_id", profile.clinic_id).single();
    if (!integration) {
      return new Response(JSON.stringify({ error: "Google not connected" }), { status: 400, headers: corsHeaders });
    }

    const accessToken = await refreshTokenIfNeeded(adminClient, integration);
    const { action } = await req.json();
    const calendarId = integration.calendar_id || "primary";

    if (action === "sync_appointment") {
      const { appointment_id } = await req.json().catch(() => ({}));
      const body = JSON.parse(await req.text().catch(() => "{}"));
      const apptId = appointment_id || body.appointment_id;

      const { data: appt } = await supabase.from("appointments")
        .select("*, patients(full_name, phone, email)")
        .eq("id", apptId).single();

      if (!appt) {
        return new Response(JSON.stringify({ error: "Appointment not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const startTime = new Date(appt.scheduled_at);
      const endTime = new Date(startTime.getTime() + (appt.duration_minutes || 30) * 60 * 1000);

      const event = {
        summary: `${appt.type} - ${appt.patients?.full_name || "Patient"}`,
        description: `Type: ${appt.type}\nPatient: ${appt.patients?.full_name}\nPhone: ${appt.patients?.phone || "N/A"}\nNotes: ${appt.notes || ""}`,
        start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
      };

      let response;
      if (appt.google_event_id) {
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${appt.google_event_id}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
          }
        );
      } else {
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
          }
        );
      }

      const eventData = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ error: eventData.error?.message || "Sync failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("appointments").update({
        google_event_id: eventData.id,
        google_sync_status: "synced",
      }).eq("id", apptId);

      return new Response(JSON.stringify({ success: true, event_id: eventData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_all") {
      const { data: unsynced } = await supabase.from("appointments")
        .select("id")
        .eq("clinic_id", profile.clinic_id)
        .is("google_event_id", null)
        .in("status", ["scheduled", "confirmed"]);

      let synced = 0;
      for (const appt of unsynced || []) {
        try {
          const { data: full } = await supabase.from("appointments")
            .select("*, patients(full_name, phone)")
            .eq("id", appt.id).single();

          if (!full) continue;

          const startTime = new Date(full.scheduled_at);
          const endTime = new Date(startTime.getTime() + (full.duration_minutes || 30) * 60 * 1000);

          const event = {
            summary: `${full.type} - ${full.patients?.full_name || "Patient"}`,
            description: `Type: ${full.type}\nPatient: ${full.patients?.full_name}`,
            start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
            end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
          };

          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(event),
            }
          );

          if (res.ok) {
            const eventData = await res.json();
            await supabase.from("appointments").update({
              google_event_id: eventData.id,
              google_sync_status: "synced",
            }).eq("id", appt.id);
            synced++;
          } else {
            await res.text(); // consume body
          }
        } catch (e) {
          console.error(`Failed to sync appointment ${appt.id}:`, e);
        }
      }

      await adminClient.from("google_integrations").update({
        last_sync_at: new Date().toISOString(),
      }).eq("clinic_id", profile.clinic_id);

      return new Response(JSON.stringify({ success: true, synced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pull_events") {
      const now = new Date();
      const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const data = await res.json();
      return new Response(JSON.stringify({ events: data.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

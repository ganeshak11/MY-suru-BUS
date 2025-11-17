// Edge Function: Create daily trips at midnight
// Call via external cron service (cron-job.org, GitHub Actions, etc.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select("schedule_id");

    if (schedErr) throw schedErr;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let created = 0;

    for (const schedule of schedules || []) {
      const { data: prevTrip } = await supabase
        .from("trips")
        .select("bus_id, driver_id")
        .eq("schedule_id", schedule.schedule_id)
        .eq("trip_date", yesterdayStr)
        .single();

      if (!prevTrip) continue;

      const { data: existingTrip } = await supabase
        .from("trips")
        .select("trip_id")
        .eq("schedule_id", schedule.schedule_id)
        .eq("trip_date", today)
        .single();

      if (existingTrip) continue;

      const { error: insertErr } = await supabase
        .from("trips")
        .insert({
          schedule_id: schedule.schedule_id,
          bus_id: prevTrip.bus_id,
          driver_id: prevTrip.driver_id,
          trip_date: today,
          status: "Scheduled"
        });

      if (!insertErr) created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${created} trips for ${today}`,
        date: today
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

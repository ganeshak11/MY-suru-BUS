// deno-lint-ignore-file no-explicit-any
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Use service role key for full table access (admin-side function)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Optional query filter for specific route (e.g., ?route_id=5)
    const url = new URL(req.url);
    const routeIdParam = url.searchParams.get("route_id");
    const routeId = routeIdParam ? Number(routeIdParam) : null;

    // Build query
    let query = supabase
      .from("schedules")
      .select(
        `
        schedule_id,
        route_id,
        start_time,
        routes (
          route_id,
          route_name
        )
      `
      )
      .order("start_time", { ascending: true });

    if (routeId) {
      if (isNaN(routeId)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid route_id parameter.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      query = query.eq("route_id", routeId);
    }

    // Execute query
    const { data: schedules, error } = await query;

    if (error) throw error;

    // Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        message: routeId
          ? `Schedules for route ID ${routeId} fetched successfully.`
          : "All schedules fetched successfully.",
        count: schedules?.length ?? 0,
        schedules,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    // Handle everything gracefully
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Failed to fetch schedules.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

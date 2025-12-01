// deno-lint-ignore-file no-explicit-any no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CreateRoutePayload {
  routeNo: string;
  routeName: string;
  stops: Array<{
    stop_id: number;
    stop_sequence: number;
    time_offset_from_start: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // Parse JSON safely
    let body: CreateRoutePayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing JSON body." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { routeNo, routeName, stops } = body;

    // Validate input
    if (!routeNo || typeof routeNo !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Valid routeNo (string) is required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!routeName || typeof routeName !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Valid routeName (string) is required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!Array.isArray(stops) || stops.length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "At least two valid stops are required to create a route.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate stop structure
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (!stop.stop_id || typeof stop.stop_id !== "number") {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid stop_id at index ${i}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Initialize Supabase client
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Insert the new route
    const { data: newRoute, error: routeError } = await supabase
      .from("routes")
      .insert([{ route_no: routeNo, route_name: routeName }])
      .select("route_id")
      .single();

    if (routeError) {
      throw new Error(`Failed to create route: ${routeError.message}`);
    }

    if (!newRoute?.route_id) {
      throw new Error("Route ID not returned after insertion.");
    }

    // Build route_stops payload
    const routeStopsData = stops.map((stop) => ({
      route_id: newRoute.route_id,
      stop_id: stop.stop_id,
      stop_sequence: stop.stop_sequence,
      time_offset_from_start: stop.time_offset_from_start || '00:00:00',
    }));

    // Insert stops into route_stops
    const { error: stopsError } = await supabase
      .from("route_stops")
      .insert(routeStopsData);

    if (stopsError) {
      // Roll back orphaned route
      await supabase.from("routes").delete().eq("route_id", newRoute.route_id);
      throw new Error(`Failed to insert route stops: ${stopsError.message}`);
    }

    // Return clean success
    return new Response(
      JSON.stringify({
        success: true,
        message: `Route "${routeName}" created successfully.`,
        route_id: newRoute.route_id,
        total_stops: routeStopsData.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    // Catch-all fallback
    const message = error?.message || "Internal server error.";
    const isClientError = message.toLowerCase().includes("invalid") || message.toLowerCase().includes("required");

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isClientError ? 400 : 500,
      }
    );
  }
});

// deno-lint-ignore-file no-explicit-any no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // Parse JSON safely
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing JSON body." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { route_id, start_time } = body;

    // Validate all fields before DB call
    if (
      !route_id ||
      typeof route_id !== "number" ||
      !start_time ||
      typeof start_time !== "string"
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Valid route_id (number) and start_time (string) are required.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Scoped Supabase client with auth header
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Insert schedule entry
    const { data, error } = await supabase
      .from("schedules")
      .insert([{ route_id, start_time }])
      .select();

    if (error) throw error;

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Schedule created successfully.",
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    // Catch-all fallback
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Internal server error.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

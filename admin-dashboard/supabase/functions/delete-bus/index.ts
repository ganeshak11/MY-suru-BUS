// deno-lint-ignore-file no-explicit-any no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts'

// Main edge function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight (browser check)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // Validate and parse request body safely
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing JSON body.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { bus_id } = body;
    if (!bus_id || typeof bus_id !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid bus_id (number) is required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client with scoped auth
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check if the bus is used in any trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('trip_id')
      .eq('bus_id', bus_id)
      .limit(1);

    if (tripsError) throw tripsError;

    if (trips && trips.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bus is associated with existing trips and cannot be deleted.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409 // Conflict
        }
      );
    }

    // Proceed to delete the bus
    const { error: deleteError } = await supabase
      .from('buses')
      .delete()
      .eq('bus_id', bus_id);

    if (deleteError) throw deleteError;

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Bus with ID ${bus_id} deleted successfully.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    // Catch-all fallback
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

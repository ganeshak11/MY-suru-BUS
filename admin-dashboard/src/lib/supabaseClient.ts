import { createBrowserClient } from '@supabase/ssr';

// This creates a Supabase client that's configured for client-side components.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

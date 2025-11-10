import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// This creates a Supabase client that's configured for client-side components.
// It will automatically handle auth cookies.
export const supabase = createClientComponentClient();

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// This is a placeholder. In a real project, this file would be generated
// by the Supabase CLI: npx supabase gen types typescript > database.types.ts
export interface Database {
  public: {
    Tables: {
      stops: {
        Row: {
          stop_id: number;
          stop_name: string;
          latitude: number;
          longitude: number;
        };
        Insert: {
          stop_id?: number;
          stop_name: string;
          latitude: number;
          longitude: number;
        };
        Update: {
          stop_id?: number;
          stop_name?: string;
          latitude?: number;
          longitude?: number;
        };
      };
      // Define other tables as needed
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Stop = Database['public']['Tables']['stops']['Row'];

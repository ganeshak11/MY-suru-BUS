export interface Database {
  public: {
    Tables: {
      stops: {
        Row: Stop;
        Insert: Omit<Stop, 'stop_id'>;
        Update: Partial<Omit<Stop, 'stop_id'>>;
      };
      // Add other tables as needed
    };
  };
}

export interface Stop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
}

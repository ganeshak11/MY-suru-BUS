import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  Constants.manifest?.extra?.supabaseUrl;

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  Constants.manifest?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL and Anon Key must be defined in app.json → expo.extra.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "../env";

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}


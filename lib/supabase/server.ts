import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase environment variables are missing");
}

export const db: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);
